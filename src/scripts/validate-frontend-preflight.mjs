#!/usr/bin/env node
/** Frontend preflight for Caffeine src/ layout (DDR-022). */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = path.join(SRC_ROOT, 'frontend');

function run(label, command, args, cwd = SRC_ROOT) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    console.error(`\nfrontend preflight FAILED at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run('bindgen dependencies', 'node', [path.join(SRC_ROOT, 'scripts/validate-frontend-bindgen-deps.mjs')]);
run('TypeScript (tsc)', 'pnpm', ['typecheck'], FRONTEND);
run('Biome lint', 'pnpm', ['check'], FRONTEND);

console.log('\nfrontend preflight OK (src/ toolchain; bindgen deps + typecheck + biome)');
