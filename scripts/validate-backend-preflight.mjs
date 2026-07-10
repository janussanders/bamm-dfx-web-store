#!/usr/bin/env node
/**
 * LOCAL DEV ONLY (repo-root mops.toml).
 * LOCAL ONLY before tagging (DDR-024). Do not invoke from caffeine.toml.
 * Never wire this path into caffeine.toml or workspace scripts/.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MOPS_TOML = path.join(ROOT, 'mops.toml');
const MAIN_MO = path.join(ROOT, 'src/backend/main.mo');
const VALIDATE_LOCK = path.join(ROOT, 'scripts/validate-mops-lock.mjs');

function fail(message) {
  console.error(`\nbackend preflight FAILED: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(MOPS_TOML)) fail(`mops.toml not found at ${MOPS_TOML}`);
if (!fs.existsSync(MAIN_MO)) fail(`main.mo not found at ${MAIN_MO}`);

execSync(`node "${VALIDATE_LOCK}"`, { cwd: ROOT, stdio: 'inherit' });

const mopsToml = fs.readFileSync(MOPS_TOML, 'utf8');
if (!mopsToml.includes('--default-persistent-actors')) {
  fail('mops.toml [moc] args must include --default-persistent-actors (IC0503 if omitted)');
}
const backendMopsTomlPath = path.join(ROOT, 'src/backend/mops.toml');
if (!fs.existsSync(backendMopsTomlPath)) {
  fail('missing src/backend/mops.toml (Caffeine Motoko sandbox SSOT — DDR-026)');
}
const backendMopsToml = fs.readFileSync(backendMopsTomlPath, 'utf8');
if (!backendMopsToml.includes('--default-persistent-actors')) {
  fail('src/backend/mops.toml must include --default-persistent-actors (IC0503 — DDR-026)');
}

const mainMo = fs.readFileSync(MAIN_MO, 'utf8');
if (/\bpersistent\s+actor\s+BAMM\b/.test(mainMo)) {
  fail('main.mo must use `actor BAMM`, not `persistent actor BAMM` (IC0503 on live canisters — DDR-017)');
}
if (!/^\(with migration = EntitlementMigration\.migration\)\s*\nactor BAMM/m.test(mainMo)) {
  fail('main.mo must declare `(with migration = EntitlementMigration.migration) actor BAMM`');
}

const checkStable = path.join(ROOT, 'scripts/check-stable/backend-02c10d9.most');
if (!fs.existsSync(checkStable)) {
  fail('missing scripts/check-stable/backend-02c10d9.most');
}

console.log(
  'backend preflight OK (local only — Caffeine: sibling mops.toml + bare mops; DDR-026)',
);
