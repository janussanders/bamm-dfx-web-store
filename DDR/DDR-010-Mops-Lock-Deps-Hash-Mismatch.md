# DDR-010: mops.lock dependency hash mismatch (Caffeine import)

**Date:** 2026-07-06  
**Status:** Implemented  
**Related:** [DDR-008](DDR-008-LicenseSigner-Core-List-Not-Buffer.md) (`sha2@0.1.14` for `LicenseSigner.mo`)

## Problem

Caffeine import failed during backend `mops install`:

```
Title: Dependency Lock File Hash Mismatch
Integrity check failed
Locked hash: e23c656c82078bca00f302b369748da970580568444ce95849bcb5602d7f5187
Actual hash:   834b39fa55d4f27a45d6377ad35dbcc7efc60e9fad5010badbee32e0d5ce985d
Exit code: 1
```

## Root cause

[DDR-008](DDR-008-LicenseSigner-Core-List-Not-Buffer.md) added `sha2 = "0.1.14"` to `mops.toml` for RSA license signing in `LicenseSigner.mo`, but **`mops.lock` was not regenerated and committed** with that change. The lock file still listed six dependencies and an old `mopsTomlDepsHash`, while `mops.toml` listed seven (including `sha2`).

Caffeine runs `mops install` on a clean tree (`.mops/` is gitignored). mops hashes the `[dependencies]` section and compares it to `mopsTomlDepsHash` in `mops.lock`; any drift fails the import before build.

## Decision

Whenever `[dependencies]` or dependency versions in `mops.toml` change:

1. Regenerate the lock file from the repo root:
   ```bash
   npx -y ic-mops@latest install
   ```
2. Commit **both** `mops.toml` and `mops.lock` in the same PR.
3. Verify locally: `npx -y ic-mops@latest check` (optional: `mops build`).

## Fix applied (2026-07-06)

- Ran `npx -y ic-mops@latest install` at repo root.
- Updated `mops.lock`:
  - `mopsTomlDepsHash` → `834b39fa55d4f27a45d6377ad35dbcc7efc60e9fad5010badbee32e0d5ce985d`
  - Added `sha2@0.1.14` to `deps` and `hashes`.

## Verification

- `npx -y ic-mops@latest install` completes with `Packages installed` and no integrity error.
- Caffeine import should pass the backend install step.

## Prevention

- Run **`pnpm validate:mops-lock`** (repo root) before pushing any change to `mops.toml` or `mops.lock`. Wired into root `pnpm build`, `pnpm check`, and `pnpm typecheck`.
- PR checklist: if `mops.toml` `[dependencies]` changed, `mops.lock` diff must be present.
- Do not rely on a local `.mops/` cache to mask a stale lock file.
