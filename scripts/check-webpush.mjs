#!/usr/bin/env node
// Checks webpush.js: the encryption against the example in RFC 8291 (section 5 and
// appendix A), and that a VAPID header verifies with its own public key.
//
//   node scripts/check-webpush.mjs

import assert from 'node:assert/strict';
import { b64url, encrypt, unb64url, vapid, vapidPublicKey } from '../webpush.js';

const subtle = crypto.subtle;
const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };

// RFC 8291 appendix A.
const RFC = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  // Section 5: the message body, header and ciphertext together.
  message:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml' +
    'mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT' +
    'pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};

const pub = unb64url(RFC.asPublic);
const jwk = { kty: 'EC', crv: 'P-256', d: RFC.asPrivate, x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33)) };
const keys = {
  privateKey: await subtle.importKey('jwk', jwk, ECDH, false, ['deriveBits']),
  publicKey: await subtle.importKey('raw', pub, ECDH, true, []),
};
const body = await encrypt(RFC.plaintext, { p256dh: RFC.uaPublic, auth: RFC.auth }, { salt: unb64url(RFC.salt), keys });
assert.equal(b64url(body), RFC.message);
console.log('aes128gcm: matches RFC 8291 section 5');

// VAPID: ECDSA signatures are random, so check that the JWT verifies and says what it should.
const header = await vapid('https://fcm.googleapis.com', jwk, 'https://example.com', 1_800_000_000);
const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
assert.equal(k, vapidPublicKey(jwk));
assert.equal(k, RFC.asPublic);
const [head, claims, signature] = token.split('.');
assert.deepEqual(JSON.parse(new TextDecoder().decode(unb64url(head))), { typ: 'JWT', alg: 'ES256' });
assert.deepEqual(JSON.parse(new TextDecoder().decode(unb64url(claims))), {
  aud: 'https://fcm.googleapis.com',
  exp: 1_800_000_000 + 12 * 3600,
  sub: 'https://example.com',
});
const verifier = await subtle.importKey('raw', unb64url(k), ECDSA, false, ['verify']);
const valid = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifier, unb64url(signature), new TextEncoder().encode(`${head}.${claims}`));
assert.ok(valid, 'VAPID signature verifies');
console.log('VAPID: JWT verifies with k');
