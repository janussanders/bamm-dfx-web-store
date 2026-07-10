#!/usr/bin/env node
/** Bindgen dep guard for Caffeine src/ layout (DDR-022). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND_TS = path.join(SRC_ROOT, 'frontend/src/backend.ts');
const FRONTEND_PKG = path.join(SRC_ROOT, 'frontend/package.json');
const REQUIRED_BINDGEN_DEPS = ['@caffeineai/object-storage'];

function fail(message) {
  console.error(`\nfrontend bindgen dependency validation FAILED: ${message}`);
  process.exit(1);
}

const backendSrc = fs.readFileSync(BACKEND_TS, 'utf8');
const frontendPkg = JSON.parse(fs.readFileSync(FRONTEND_PKG, 'utf8'));
const deps = { ...frontendPkg.dependencies, ...frontendPkg.devDependencies };
const importRe = /from\s+["'](@caffeineai\/[^"']+)["']/g;
const imported = new Set();
for (const match of backendSrc.matchAll(importRe)) imported.add(match[1]);

for (const pkg of REQUIRED_BINDGEN_DEPS) {
  if (!deps[pkg]) fail(`frontend/package.json missing direct dependency "${pkg}"`);
}
for (const pkg of imported) {
  if (!deps[pkg]) fail(`backend.ts imports "${pkg}" but it is not a direct frontend dependency`);
}

console.log('frontend bindgen dependency validation OK (src/ toolchain)');
