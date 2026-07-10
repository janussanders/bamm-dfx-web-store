#!/usr/bin/env node
/** mops.lock guard for src/ Caffeine toolchain (DDR-022). */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOPS_TOML = path.join(SRC_ROOT, 'mops.toml');
const MOPS_LOCK = path.join(SRC_ROOT, 'mops.lock');

function parseDependencySection(toml, sectionName) {
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
  process.exit(1);
}

if (!fs.existsSync(MOPS_TOML)) fail('src/mops.toml not found');
if (!fs.existsSync(MOPS_LOCK)) fail('src/mops.lock not found');

const tomlText = fs.readFileSync(MOPS_TOML, 'utf8');
const lock = JSON.parse(fs.readFileSync(MOPS_LOCK, 'utf8'));
const actualHash = getMopsTomlDepsHash(tomlText);
if (lock.mopsTomlDepsHash !== actualHash) fail('src/mops.toml dependencies hash mismatch');

console.log('mops.lock validation OK (src/ toolchain)');
