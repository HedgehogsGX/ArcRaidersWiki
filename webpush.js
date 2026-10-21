// Web Push with WebCrypto only, for the map condition alerts worker.js sends. The
// push service learns who is sending from a VAPID signature (RFC 8292); the message
// itself is encrypted for the browser with aes128gcm (RFC 8291, RFC 8188), so the
// push service can't read it. scripts/check-webpush.mjs tests this against the
// example in RFC 8291.

const subtle = crypto.subtle;
const utf8 = new TextEncoder();
const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };
const RECORD = 4096;

export const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
export const unb64url = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const key = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

// The body of a push message to a browser whose subscription has these keys: a
// header (salt, record size, the sender's one-time public key), then the payload
// as a single encrypted record. `fixed` swaps the random salt and key pair for
// given ones, for the RFC test.
export async function encrypt(payload, { p256dh, auth }, fixed = {}) {
  const uaPublic = unb64url(p256dh);
  const salt = fixed.salt || crypto.getRandomValues(new Uint8Array(16));
  const local = fixed.keys || (await subtle.generateKey(ECDH, true, ['deriveBits']));
  const asPublic = new Uint8Array(await subtle.exportKey('raw', local.publicKey));
  const ua = await subtle.importKey('raw', uaPublic, ECDH, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: ua }, local.privateKey, 256));

  const ikm = await hkdf(unb64url(auth), shared, concat(utf8.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, utf8.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8.encode('Content-Encoding: nonce\0'), 12);

  const key = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // 0x02 marks the last (and only) record; no padding.
  const record = concat(typeof payload === 'string' ? utf8.encode(payload) : payload, [2]);
  if (record.length + 16 > RECORD) throw new Error('push payload too large');
  const sealed = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, record));

  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, RECORD);
  header[20] = asPublic.length;
  return concat(header, asPublic, sealed);
}

// The VAPID private key: a P-256 JWK with d, x and y (scripts/vapid-keys.mjs).
export const vapidPublicKey = (jwk) => b64url(concat([4], unb64url(jwk.x), unb64url(jwk.y)));

// The Authorization header for pushes to one push service (the endpoint's origin),
// valid for 12 hours. `subject` is a contact for the push service: a mailto: or
// https: URL.
export async function vapid(audience, jwk, subject, now = Date.now() / 1000) {
  const part = (value) => b64url(utf8.encode(JSON.stringify(value)));
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: audience, exp: Math.floor(now) + 12 * 3600, sub: subject })}`;
  const { kty, crv, d, x, y } = jwk;
  const key = await subtle.importKey('jwk', { kty, crv, d, x, y }, ECDSA, false, ['sign']);
  // WebCrypto's ECDSA signature is r || s, which is what a JWT wants.
  const signature = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8.encode(unsigned));
  return `vapid t=${unsigned}.${b64url(signature)}, k=${vapidPublicKey(jwk)}`;
}

// Sends one message. The push service answers 201 when it takes it, 404 or 410
// when the subscription is gone. `ttl` is how long (seconds) it may hold the
// message for a browser that is offline.
export async function sendPush(subscription, payload, { authorization, ttl, urgency = 'high' }) {
  const body = await encrypt(payload, subscription.keys);
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      authorization,
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: String(Math.max(0, Math.floor(ttl))),
      urgency,
    },
    body,
  });
}
