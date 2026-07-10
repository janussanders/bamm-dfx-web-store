#!/usr/bin/env node
/**
 * Caffeine release helper (DDR-027 / DDR-015 / DDR-018).
 *
 * Automates what git/gh can do; prints exact Caffeine operator + agent prompts
 * for steps that remain UI-only (import, redeploy_draft, promote).
 *
 * Usage:
 *   node scripts/caffeine-release.mjs v133.0.13              # preflight + print notes/prompts
 *   node scripts/caffeine-release.mjs v133.0.13 --publish    # also tag + gh release (title=tag)
 *   node scripts/caffeine-release.mjs v133.0.13 --notes-only # print release body only
 *   node scripts/caffeine-release.mjs v133.0.13 --skip-preflight
 *
 * Env:
 *   CAFFEINE_DRAFT_BACKEND_CANISTER  override draft backend id (default ucnbj-…)
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT_BACKEND =
  process.env.CAFFEINE_DRAFT_BACKEND_CANISTER || 'ucnbj-nqaaa-aaaab-aajua-cai';
const REPO = 'janussanders/bamm-e-commerce-site';
const STOREFRONT = 'https://bamm-gw3.caffeine.xyz/';

const args = process.argv.slice(2);
const tag = args.find((a) => !a.startsWith('-'));
const publish = args.includes('--publish');
const notesOnly = args.includes('--notes-only');
const skipPreflight = args.includes('--skip-preflight');

function fail(message) {
  console.error(`\ncaffeine-release FAILED: ${message}`);
  process.exit(1);
}

function run(label, command, cmdArgs, opts = {}) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, cmdArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
    ...opts,
  });
  if (result.status !== 0) {
    fail(`${label} exited ${result.status ?? 1}`);
  }
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function buildReleaseNotes(version, commit) {
  return `## Pinned docs

- **DDR-027** — Caffeine agentic workspace (manual import, \`redeploy_draft\`, build-only)
- **DDR-028** — Entitlement registry backfill (Admin → Entitlements → Backfill from purchases)
- **DDR-029** — Storefront tag + desktop installer version visibility
- **DDR-030** — Admin License Management issues v2 networked grace licenses
- **DDR-026** — Sibling \`mops.toml\` + bare \`mops\` in Motoko sandbox

Verify after promote: footer shows Storefront \`${version}\`; Admin → License Management Manual Send creates Entitlements row + \`schema_version: 2\`; Installers shows Desktop \`vX.Y.Z\` from uploaded \`BAMM-*\` filenames.

## Import (operator — Caffeine UI only)

1. GitHub Settings → repo \`${REPO}\`
2. Git ref: \`${version}\` (or blank if \`main\` tip == this tag)
3. **Import from GitHub** → wait ~60s
4. Commit expected: \`${commit}\`

## If IC0503 on draft (DDR-017 / DDR-027)

Draft backend: \`${DRAFT_BACKEND}\`

Paste to platform agent:

\`\`\`
IC0503 on draft backend ${DRAFT_BACKEND} (DDR-017 / DDR-027).

Do NOT edit migration, caffeine.toml, mops.toml, or actor shape.
Do NOT reinstall production.
Do NOT claim entitlementId migration is missing.

Required:
1. redeploy_draft — reinstall draft canisters only (backend ${DRAFT_BACKEND} + draft frontend). Clears draft stable state. Does not touch live/production.
2. After redeploy_draft completes: build only from current workspace (imported ${version}). Deploy to draft only.
3. No GitHub import. No migration edits.

Report success only when draft install succeeds without IC0503.
\`\`\`

## Build only (after import, and after redeploy_draft if needed)

Paste to draft/composer agent:

\`\`\`
Build only from the current workspace. Run backend and frontend builds per caffeine.toml.
Deploy to draft only.
Do not import from GitHub.
Do not edit caffeine.toml, mops.toml, migration, or actor shape.
Do not reinstall production.
If IC0503 occurs, stop and request redeploy_draft for ${DRAFT_BACKEND}.
\`\`\`

## After draft OK

1. Promote / Push version update (operator UI)
2. Verify ${STOREFRONT} (hero, /terms, Admin → Entitlements)
3. If registry empty after networked deploy: **Backfill from purchases** (DDR-028)

## Not automated by this helper

GitHub import, \`redeploy_draft\`, and production promote remain Caffeine UI / platform-agent steps (no public API from this repo).
`;
}

function printPrompts(version) {
  console.log(`
════════════════════════════════════════════════════════════
Caffeine operator checklist — ${version}
════════════════════════════════════════════════════════════

1) Import (UI): GitHub Settings → ${REPO} → ref ${version}
2) If IC0503 on ${DRAFT_BACKEND}: confirm redeploy_draft (draft only)
3) Build only (paste below)
4) Promote when draft verifies
5) Optional: Entitlements → Backfill from purchases (DDR-028)

─── Platform agent (IC0503) ───
IC0503 on draft backend ${DRAFT_BACKEND} (DDR-017 / DDR-027).

Do NOT edit migration, caffeine.toml, mops.toml, or actor shape.
Do NOT reinstall production.
Do NOT claim entitlementId migration is missing.

Required:
1. redeploy_draft — reinstall draft canisters only (backend ${DRAFT_BACKEND} + draft frontend). Clears draft stable state. Does not touch live/production.
2. After redeploy_draft completes: build only from current workspace (imported ${version}). Deploy to draft only.
3. No GitHub import. No migration edits.

Report success only when draft install succeeds without IC0503.

─── Draft/composer agent (build only) ───
Build only from the current workspace. Run backend and frontend builds per caffeine.toml.
Deploy to draft only.
Do not import from GitHub.
Do not edit caffeine.toml, mops.toml, migration, or actor shape.
Do not reinstall production.
If IC0503 occurs, stop and request redeploy_draft for ${DRAFT_BACKEND}.
════════════════════════════════════════════════════════════
`);
}

if (!tag) {
  fail(
    'Usage: node scripts/caffeine-release.mjs <v133.x.y> [--publish] [--notes-only] [--skip-preflight]',
  );
}

if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  fail(`tag must look like v133.0.13 (got ${JSON.stringify(tag)})`);
}

const commit = git('rev-parse HEAD');
const branch = git('rev-parse --abbrev-ref HEAD');
const notes = buildReleaseNotes(tag, commit);

if (notesOnly) {
  process.stdout.write(notes);
  process.exit(0);
}

console.log(`caffeine-release: tag=${tag} commit=${commit} branch=${branch}`);

if (!skipPreflight) {
  if (!fs.existsSync(path.join(ROOT, 'scripts/sync-caffeine-src-toolchain.mjs'))) {
    fail('missing scripts/sync-caffeine-src-toolchain.mjs');
  }
  run('sync caffeine src toolchain', 'node', [
    'scripts/sync-caffeine-src-toolchain.mjs',
  ]);
  run('stamp storefront version', 'node', [
    'scripts/write-storefront-version.mjs',
    tag,
  ]);
  run('validate caffeine config', 'node', [
    'scripts/validate-caffeine-config.mjs',
  ]);
  run('validate mops lock', 'node', ['scripts/validate-mops-lock.mjs']);
  run('backend preflight', 'node', ['scripts/validate-backend-preflight.mjs']);
  run('frontend preflight', 'node', [
    'scripts/validate-frontend-preflight.mjs',
  ]);
} else {
  console.log('\n→ skipping preflight (--skip-preflight)');
  run('stamp storefront version', 'node', [
    'scripts/write-storefront-version.mjs',
    tag,
  ]);
}

const notesPath = path.join(ROOT, `.caffeine-release-${tag}-notes.md`);
fs.writeFileSync(notesPath, notes, 'utf8');
console.log(`\n→ wrote ${path.relative(ROOT, notesPath)}`);

printPrompts(tag);

if (!publish) {
  console.log(`Dry run complete. To tag + GitHub release:

  node scripts/caffeine-release.mjs ${tag} --publish

Or manually:
  git tag -a ${tag} -m "release ${tag}"
  git push origin ${tag}
  gh release create ${tag} --title "${tag}" --notes-file ${path.relative(ROOT, notesPath)}
`);
  process.exit(0);
}

if (branch !== 'main') {
  fail(`--publish requires branch main (on ${branch})`);
}

try {
  git(`rev-parse ${tag}`);
  fail(`tag ${tag} already exists locally`);
} catch {
  // tag free
}

run(`create annotated tag ${tag}`, 'git', [
  'tag',
  '-a',
  tag,
  '-m',
  `release ${tag}`,
]);
run(`push tag ${tag}`, 'git', ['push', 'origin', tag]);
run(`gh release create ${tag}`, 'gh', [
  'release',
  'create',
  tag,
  '--title',
  tag,
  '--notes-file',
  notesPath,
]);

console.log(`\nPublished ${tag} → https://github.com/${REPO}/releases/tag/${tag}`);
printPrompts(tag);
console.log(
  'Next: Caffeine UI import → (if IC0503) redeploy_draft → build only → promote.',
);
