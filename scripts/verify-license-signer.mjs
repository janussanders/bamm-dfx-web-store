#!/usr/bin/env node
/**
 * Cross-checks license payload signing against Node crypto (BAMM desktop verifier).
 * Usage: node scripts/verify-license-signer.mjs [path/to/private.pem]
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pemPath =
  process.argv[2] ||
  path.join(__dirname, '../../BAMM/scripts/private.pem');

if (!fs.existsSync(pemPath)) {
  console.error('No private.pem found at', pemPath);
  process.exit(1);
}

const PRIVATE_KEY = fs.readFileSync(pemPath, 'utf8');
const payload = {
  features: ['Paycheck Budget', 'Goals'],
  issued_to: 'test@example.com',
  expires: '2027-06-18',
  generated_by: 'BAMM License Generation System',
  generated_at: new Date().toISOString(),
};

const payloadStr = JSON.stringify(payload);
const sign = crypto.createSign('SHA256');
sign.update(payloadStr);
sign.end();
const signature = sign.sign(PRIVATE_KEY, 'base64');

const publicKey = crypto.createPublicKey(PRIVATE_KEY);
const verify = crypto.createVerify('SHA256');
verify.update(payloadStr);
const valid = verify.verify(publicKey, signature, 'base64');

console.log('Payload:', payloadStr);
console.log('Signature length:', signature.length);
console.log('Node verify:', valid ? 'OK' : 'FAIL');
