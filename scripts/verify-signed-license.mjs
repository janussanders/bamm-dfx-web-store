#!/usr/bin/env node
/**
 * Verifies a BAMM license JSON file the same way the desktop app does
 * (JSON.stringify(payload) + RSA-SHA256 + bundled public.pem).
 *
 * Usage:
 *   node scripts/verify-signed-license.mjs path/to/license.json [path/to/public.pem]
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const licensePath = process.argv[2];
const publicPemPath =
  process.argv[3] || path.join(__dirname, '../../BAMM/scripts/public.pem');

if (!licensePath || !fs.existsSync(licensePath)) {
  console.error('Usage: node scripts/verify-signed-license.mjs <license.json> [public.pem]');
  process.exit(1);
}
if (!fs.existsSync(publicPemPath)) {
  console.error('public.pem not found at', publicPemPath);
  process.exit(1);
}

const PUBLIC_KEY = fs.readFileSync(publicPemPath, 'utf8');
const license = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
const payloadStr = JSON.stringify(license.payload);

const verify = crypto.createVerify('SHA256');
verify.update(payloadStr);
const valid = verify.verify(PUBLIC_KEY, license.signature, 'base64');

console.log('License file:', licensePath);
console.log('Public key:', publicPemPath);
console.log('Payload string:', payloadStr);
console.log('Valid:', valid ? 'YES' : 'NO — check canister private key matches this public.pem');

process.exit(valid ? 0 : 1);
