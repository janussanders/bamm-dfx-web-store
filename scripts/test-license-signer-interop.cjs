#!/usr/bin/env node
/**
 * Signs a canonical license payload with Node/OpenSSL and verifies against public.pem.
 * Usage: node scripts/test-license-signer-interop.cjs [private.pem] [public.pem]
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const privatePemPath =
  process.argv[2] || path.join(__dirname, '../../BAMM/scripts/private.pem');
const publicPemPath =
  process.argv[3] || path.join(__dirname, '../../BAMM/scripts/public.pem');

if (!fs.existsSync(privatePemPath) || !fs.existsSync(publicPemPath)) {
  console.error('Missing key files. Pass paths to private.pem and public.pem.');
  process.exit(1);
}

const PRIVATE_KEY = fs.readFileSync(privatePemPath, 'utf8');
const PUBLIC_KEY = fs.readFileSync(publicPemPath, 'utf8');

const payload = {
  features: ['Goals', 'Paycheck Budget'],
  issued_to: 'interop@example.com',
  expires: '2027-07-06',
  generated_by: 'BAMM License Generation System',
  generated_at: '2026-07-06T20:00:00.000Z',
};

const payloadStr = JSON.stringify(payload);
const sign = crypto.createSign('SHA256');
sign.update(payloadStr);
const nodeSig = sign.sign(PRIVATE_KEY, 'base64');

const opensslSig = execFileSync(
  'openssl',
  ['dgst', '-sha256', '-sign', privatePemPath],
  { input: payloadStr },
).toString('base64');

const verify = (sig) => {
  const v = crypto.createVerify('SHA256');
  v.update(payloadStr);
  return v.verify(PUBLIC_KEY, sig, 'base64');
};

console.log('Payload:', payloadStr);
console.log('Node signature verifies:', verify(nodeSig));
console.log('OpenSSL signature verifies:', verify(opensslSig));

process.exit(verify(nodeSig) && verify(opensslSig) ? 0 : 1);
