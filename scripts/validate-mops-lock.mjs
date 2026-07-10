#!/usr/bin/env node
/**
 * Fast local guard: mops.toml [dependencies] must match mops.lock (mopsTomlDepsHash + deps).
 * Mirrors ic-mops getMopsTomlDepsHash() — see DDR-010.
 *
 * Usage (repo root): node scripts/validate-mops-lock.mjs
 * Fix drift: npx -y ic-mops@latest install
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MOPS_TOML = path.join(ROOT, 'mops.toml');
const MOPS_LOCK = path.join(ROOT, 'mops.lock');

function parseDependencySection(toml, sectionName) {
  const sectionRe = new RegExp(
    `\\[${sectionName}\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[|$)`,
  );
  const match = toml.match(sectionRe);
  if (!match) return {};

  const deps = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const quoted = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*"([^"]+)"/);
    if (quoted) {
      deps[quoted[1]] = quoted[2];
      continue;
    }
    const bare = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*([^\s#]+)/);
    if (bare) deps[bare[1]] = bare[2];
  }
  return deps;
}

function getMopsTomlDepsHash(tomlText) {
  const allDeps = {
    ...parseDependencySection(tomlText, 'dependencies'),
    ...parseDependencySection(tomlText, 'dev-dependencies'),
  };
  const sortedDeps = Object.keys(allDeps)
    .sort()
    .reduce((acc, key) => {
      acc[key] = allDeps[key];
      return acc;
    }, {});
  return createHash('sha256').update(JSON.stringify(sortedDeps)).digest('hex');
}

function fail(message) {
  console.error(`\nmops.lock validation FAILED: ${message}`);
  console.error('\nRegenerate and commit the lock file:');
  console.error('  npx -y ic-mops@latest install');
  console.error('\nSee DDR/DDR-010-Mops-Lock-Deps-Hash-Mismatch.md');
  process.exit(1);
}

if (!fs.existsSync(MOPS_TOML)) fail('mops.toml not found');
if (!fs.existsSync(MOPS_LOCK)) fail('mops.lock not found — run `npx -y ic-mops@latest install`');

const tomlText = fs.readFileSync(MOPS_TOML, 'utf8');
let lock;
try {
  lock = JSON.parse(fs.readFileSync(MOPS_LOCK, 'utf8'));
} catch {
  fail('mops.lock is not valid JSON');
}

if (lock.version !== 3) {
  fail(`unsupported mops.lock version ${lock.version} (expected 3)`);
}

const actualHash = getMopsTomlDepsHash(tomlText);
if (lock.mopsTomlDepsHash !== actualHash) {
  console.error('\nmops.lock validation FAILED: mops.toml dependencies hash mismatch');
  console.error(`  Locked hash: ${lock.mopsTomlDepsHash}`);
  console.error(`  Actual hash: ${actualHash}`);
  console.error('\nRegenerate and commit the lock file:');
  console.error('  npx -y ic-mops@latest install');
  console.error('\nSee DDR/DDR-010-Mops-Lock-Deps-Hash-Mismatch.md');
  process.exit(1);
}

const tomlDeps = {
  ...parseDependencySection(tomlText, 'dependencies'),
  ...parseDependencySection(tomlText, 'dev-dependencies'),
};

for (const [name, version] of Object.entries(tomlDeps)) {
  if (!lock.deps?.[name]) {
    fail(`dependency "${name}" missing from mops.lock deps`);
  }
  if (lock.deps[name] !== version) {
    fail(
      `dependency "${name}" version mismatch (mops.toml=${version}, mops.lock=${lock.deps[name]})`,
    );
  }
}

for (const name of Object.keys(lock.deps ?? {})) {
  if (!(name in tomlDeps)) {
    fail(`mops.lock lists "${name}" but mops.toml has no such dependency`);
  }
}

console.log('mops.lock validation OK');
console.log(`  dependencies: ${Object.keys(tomlDeps).length}`);
console.log(`  mopsTomlDepsHash: ${actualHash.slice(0, 12)}…`);
