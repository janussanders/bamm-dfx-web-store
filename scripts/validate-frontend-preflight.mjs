#!/usr/bin/env node
/**
 * Runs all frontend gates that must pass before Caffeine import/build.
 * Mirrors src/frontend/caffeine.toml [check] + bindgen dependency validation.
 *
 * Usage (repo root): node scripts/validate-frontend-preflight.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'src/frontend');

function run(label, command, args, cwd = ROOT) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    console.error(`\nfrontend preflight FAILED at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run('bindgen dependencies', 'node', [
  path.join(ROOT, 'scripts/validate-frontend-bindgen-deps.mjs'),
]);
run('TypeScript (tsc)', 'pnpm', ['typecheck'], FRONTEND);
run('Biome lint', 'pnpm', ['check'], FRONTEND);

console.log('\nfrontend preflight OK (bindgen deps + typecheck + biome)');
