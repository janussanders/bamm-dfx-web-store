#!/usr/bin/env node
/**
 * Ensures bindgen imports in src/frontend/src/backend.ts are direct dependencies.
 * DDR-003: @caffeineai/object-storage is no longer required (local dfxExternalBlob shim).
 *
 * Usage (repo root): node scripts/validate-frontend-bindgen-deps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BACKEND_TS = path.join(ROOT, 'src/frontend/src/backend.ts');
const FRONTEND_PKG = path.join(ROOT, 'src/frontend/package.json');

/** Packages that must remain direct deps if imported from backend.ts */
const REQUIRED_BINDGEN_DEPS = [];

function fail(message) {
  console.error(`\nfrontend bindgen dependency validation FAILED: ${message}`);
  console.error('\nAdd missing packages to src/frontend/package.json dependencies, then:');
  console.error('  pnpm install');
  console.error('\nSee DDR/DDR-003-Dfx-Object-Storage-Replacement.md');
  process.exit(1);
}

const backendSrc = fs.readFileSync(BACKEND_TS, 'utf8');
const frontendPkg = JSON.parse(fs.readFileSync(FRONTEND_PKG, 'utf8'));
const deps = {
  ...frontendPkg.dependencies,
  ...frontendPkg.devDependencies,
};

if (/from\s+["']@caffeineai\/object-storage["']/.test(backendSrc)) {
  fail('backend.ts still imports caffeine object-storage — use ./lib/dfxExternalBlob (DDR-003)');
}

const importRe = /from\s+["'](@caffeineai\/[^"']+)["']/g;
const imported = new Set();
for (const match of backendSrc.matchAll(importRe)) {
  imported.add(match[1]);
}

for (const pkg of REQUIRED_BINDGEN_DEPS) {
  if (!deps[pkg]) {
    fail(`src/frontend/package.json missing direct dependency "${pkg}"`);
  }
}

for (const pkg of imported) {
  if (!deps[pkg]) {
    fail(`backend.ts imports "${pkg}" but it is not a direct frontend dependency`);
  }
}

console.log('frontend bindgen dependency validation OK');
console.log(`  @caffeineai imports in backend.ts: ${imported.size}`);
console.log('  ExternalBlob: local ./lib/dfxExternalBlob shim (DDR-003)');
