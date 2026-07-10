#!/usr/bin/env node
/**
 * Sync Caffeine src/backend mops artifacts from repo-root SSOT before tagging.
 * Run: node scripts/sync-caffeine-src-toolchain.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

copy(path.join(ROOT, 'mops.lock'), path.join(ROOT, 'src/mops.lock'));
copy(path.join(ROOT, 'mops.lock'), path.join(ROOT, 'src/backend/mops.lock'));
copy(
  path.join(ROOT, 'scripts/check-stable/backend-02c10d9.most'),
  path.join(ROOT, 'src/backend/caffeine-check-stable.most'),
);

console.log('synced src/mops.lock, src/backend/mops.lock, caffeine-check-stable.most');
