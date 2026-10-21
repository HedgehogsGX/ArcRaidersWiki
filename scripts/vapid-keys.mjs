#!/usr/bin/env node
// Makes a VAPID key pair for the map condition push alerts (worker.js). Run once:
//
//   node scripts/vapid-keys.mjs
//
// The public key goes in VAPID_KEY at the top of assets/js/conditions.js. The
// private key is a secret on the Worker: run `npx wrangler secret put
// VAPID_PRIVATE_KEY` and paste it; it never goes in the repository. A new pair
// cuts off every browser subscribed with the old one until its reader opens the
// site again.

import { vapidPublicKey } from '../webpush.js';

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const { kty, crv, d, x, y } = await crypto.subtle.exportKey('jwk', pair.privateKey);
const jwk = { kty, crv, d, x, y };

console.log(`Public key (VAPID_KEY in assets/js/conditions.js):\n${vapidPublicKey(jwk)}\n`);
console.log(`Private key (npx wrangler secret put VAPID_PRIVATE_KEY):\n${JSON.stringify(jwk)}`);
