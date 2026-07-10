#!/usr/bin/env node
/**
 * Regenerate scripts/check-stable/backend-02c10d9.most for mops check-stable.
 * Default baseline commit 02c10d9 matches live IC canisters (getLicensingPolicy, no registry).
 *
 * Override: CHECK_STABLE_REF=02c10d9 node scripts/build-check-stable-baseline.mjs
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const baselineRef = process.env.CHECK_STABLE_REF?.trim() || '02c10d9';
const outPath = path.join(repoRoot, 'scripts/check-stable/backend-02c10d9.most');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bamm-check-stable-'));
try {
  const archive = execSync(`git archive ${baselineRef} src/backend mops.toml mops.lock`, {
    cwd: repoRoot,
  });
  execSync('tar -x', { cwd: tmp, input: archive });

  execSync('npx -y ic-mops@latest install', { cwd: tmp, stdio: 'inherit' });
  execSync('npx -y ic-mops@latest build', { cwd: tmp, stdio: 'inherit' });

  const most = path.join(tmp, 'src/backend/dist/backend.most');
  if (!fs.existsSync(most)) {
    throw new Error(`No backend.most at ${most}`);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.copyFileSync(most, outPath);
  console.log(`Wrote ${outPath} (${fs.statSync(outPath).size} bytes) from ${baselineRef}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
