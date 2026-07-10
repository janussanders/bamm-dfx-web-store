#!/usr/bin/env node
/**
 * Guardrail: locked Caffeine build configuration (DDR-021 / DDR-026).
 * Motoko sandbox: sibling mops.toml + bare mops; no cd ..; no sibling preflight scripts.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`\ncaffeine config guard FAILED: ${message}`);
  console.error('See DDR/DDR-026-Caffeine-Sibling-Mops-Toml.md');
  process.exit(1);
}

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) fail(`missing required file: ${rel}`);
  return fs.readFileSync(abs, 'utf8');
}

function mustInclude(haystack, needle, label) {
  if (!haystack.includes(needle)) fail(`${label} must contain: ${JSON.stringify(needle)}`);
}

function mustNotInclude(haystack, needle, label) {
  if (haystack.includes(needle)) fail(`${label} must NOT contain: ${JSON.stringify(needle)}`);
}

function parseDeps(toml, sectionName) {
  const sectionRe = new RegExp(`\\[${sectionName}\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[|$)`);
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

function depsHash(tomlText) {
  const allDeps = {
    ...parseDeps(tomlText, 'dependencies'),
    ...parseDeps(tomlText, 'dev-dependencies'),
  };
  const sortedDeps = Object.keys(allDeps)
    .sort()
    .reduce((acc, key) => {
      acc[key] = allDeps[key];
      return acc;
    }, {});
  return createHash('sha256').update(JSON.stringify(sortedDeps)).digest('hex');
}

const rootToml = read('caffeine.toml');
mustInclude(rootToml, 'include = ["src/**"]', 'caffeine.toml workspace');

const backendToml = read('src/backend/caffeine.toml');
for (const cmd of ['"mops install"', '"mops build"', '"pnpm bindgen"']) {
  mustInclude(backendToml, cmd, 'src/backend/caffeine.toml [build]');
}
mustNotInclude(backendToml, 'cd ..', 'src/backend/caffeine.toml');
mustNotInclude(backendToml, 'caffeine-preflight', 'src/backend/caffeine.toml');
mustNotInclude(backendToml, '../scripts/', 'src/backend/caffeine.toml');
mustNotInclude(backendToml, '../../scripts/', 'src/backend/caffeine.toml');
mustNotInclude(backendToml, 'node ', 'src/backend/caffeine.toml');

const backendMops = read('src/backend/mops.toml');
mustInclude(backendMops, '--default-persistent-actors', 'src/backend/mops.toml [moc] args');
mustInclude(backendMops, 'main = "main.mo"', 'src/backend/mops.toml canisters.backend');
mustInclude(backendMops, 'path = "caffeine-check-stable.most"', 'src/backend/mops.toml check-stable');

const lock = JSON.parse(read('src/backend/mops.lock'));
if (depsHash(backendMops) !== lock.mopsTomlDepsHash) {
  fail('src/backend/mops.toml deps hash mismatch vs src/backend/mops.lock — run sync-caffeine-src-toolchain.mjs');
}

const frontendToml = read('src/frontend/caffeine.toml');
mustInclude(frontendToml, 'rm -rf dist', 'src/frontend/caffeine.toml [build]');
mustNotInclude(frontendToml, 'caffeine-preflight', 'src/frontend/caffeine.toml');

const frontendPkg = read('src/frontend/package.json');
mustInclude(frontendPkg, 'vite build', 'src/frontend/package.json build');
mustNotInclude(frontendPkg, 'caffeine-preflight', 'src/frontend/package.json build');

for (const rel of [
  'src/backend/mops.toml',
  'src/backend/mops.lock',
  'src/backend/caffeine-check-stable.most',
  'src/package.json',
]) {
  if (!fs.existsSync(path.join(ROOT, rel))) fail(`missing Caffeine toolchain file: ${rel}`);
}

console.log('caffeine config guard OK (DDR-026 — sibling mops.toml + bare mops)');
