#!/usr/bin/env node
/**
 * Caffeine VM backend preflight — lives under src/scripts/ (DDR-022).
 * Caffeine materializes src/** only; repo-root scripts/ is not on the import VM.
 * Local repo-root copy: scripts/validate-backend-preflight.mjs
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, '..');
const MOPS_TOML = path.join(SRC_ROOT, 'mops.toml');
const MAIN_MO = path.join(SRC_ROOT, 'backend/main.mo');
const VALIDATE_LOCK = path.join(SRC_ROOT, 'scripts/validate-mops-lock.mjs');

function fail(message) {
  console.error(`\nbackend preflight FAILED: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(MOPS_TOML)) fail(`mops.toml not found at ${MOPS_TOML}`);
if (!fs.existsSync(MAIN_MO)) fail(`main.mo not found at ${MAIN_MO}`);

execSync(`node "${VALIDATE_LOCK}"`, { cwd: SRC_ROOT, stdio: 'inherit' });

const mopsToml = fs.readFileSync(MOPS_TOML, 'utf8');
if (!mopsToml.includes('--default-persistent-actors')) {
  fail('mops.toml [moc] args must include --default-persistent-actors (IC0503 if omitted)');
}

const mainMo = fs.readFileSync(MAIN_MO, 'utf8');
if (/\bpersistent\s+actor\s+BAMM\b/.test(mainMo)) {
  fail('main.mo must use `actor BAMM`, not `persistent actor BAMM` (IC0503 — DDR-017)');
}
if (!/^\(with migration = EntitlementMigration\.migration\)\s*\nactor BAMM/m.test(mainMo)) {
  fail('main.mo must declare `(with migration = EntitlementMigration.migration) actor BAMM`');
}

const checkStable = path.join(SRC_ROOT, 'scripts/check-stable/backend-02c10d9.most');
if (!fs.existsSync(checkStable)) {
  fail('missing src/scripts/check-stable/backend-02c10d9.most');
}

console.log(
  'backend preflight OK (src/ toolchain; actor shape + persistence flags + mops.lock; DDR-022)',
);
