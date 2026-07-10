# DDR-026: Sibling `mops.toml` in Motoko sandbox (IC0503 + no parent cwd)

**Date:** 2026-07-08  
**Status:** Approved  
**Amends:** [DDR-024](DDR-024-Caffeine-Inline-Platform-Build.md), [DDR-025](DDR-025-Caffeine-Mops-From-Src.md), [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md) §4  
**Related:** [DDR-019](DDR-019-IC-Memory-Errors-vs-IC0503.md), [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md)

## Problem

| Tag | Approach | Result |
|-----|----------|--------|
| v133.0.9 | Bare `mops` from `src/backend/` (no sibling mops.toml) | Build ran; **IC0503** on `ucnbj` (wasm likely missing `--default-persistent-actors`) |
| v133.0.10 | `bash -c 'cd .. && mops …'` | **`mops.toml` not found** — parent `src/` is **outside** the Motoko build sandbox |

Constraints that must all hold:

1. Motoko sandbox cwd is effectively **`src/backend/`** only — `cd ..` does not see `src/mops.toml`.
2. Sibling `.mjs`/`.sh` are not reliable (DDR-024).
3. Wasm must be compiled with **`--default-persistent-actors`** (DDR-017 / DDR-019) or upgrade → IC0503.
4. Actor shape remains `(with migration = …) actor BAMM`.

## Decision

### Place Caffeine mops config **beside `main.mo`**

| File | Role |
|------|------|
| `src/backend/mops.toml` | Paths relative to `src/backend/`; `[moc] args` include `--default-persistent-actors` |
| `src/backend/mops.lock` | Same deps hash as repo-root lock |
| `src/backend/caffeine-check-stable.most` | check-stable baseline (already present) |

### Backend `caffeine.toml` commands

```toml
[build]
commands = ["mops install", "mops build", "pnpm bindgen"]
```

Bare `mops` is correct **only when** sibling `mops.toml` carries the persistence flags. That is the difference from the broken v133.0.9 assumption (platform default / missing flags).

### Keep dual layouts

| Layout | Purpose |
|--------|---------|
| Repo-root `mops.toml` | Local `npx ic-mops` from repo root |
| `src/mops.toml` | Optional src-tree tooling |
| `src/backend/mops.toml` | **Caffeine Motoko sandbox SSOT** |

Before tagging: sync lock + verify deps hash:

```bash
node scripts/sync-caffeine-src-toolchain.mjs
node scripts/validate-caffeine-config.mjs
node scripts/validate-backend-preflight.mjs
```

### Draft canister recovery

If IC0503 persists on `ucnbj-…` after a correct wasm build, operator confirms **`redeploy_draft`** (DDR-027), then agent **build only**. Do not reinstall production. Do not edit EntitlementMigration.

## Import tag

**`v133.0.11`** (+ agentic workflow [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md))

## Agent rules

- **Do not** `cd ..` for mops on Caffeine (parent not in sandbox).
- **Do not** remove `--default-persistent-actors` from `src/backend/mops.toml`.
- **Do not** reintroduce sibling preflight `.mjs` into caffeine.toml.
- **Do not** delete `src/backend/mops.toml` / `mops.lock`.
- **Do not** GitHub-import from chat; **do not** “fix” draft IC0503 by rewriting migration (DDR-027).

## Verification

```bash
test -f src/backend/mops.toml
grep -F -- '--default-persistent-actors' src/backend/mops.toml
node scripts/validate-caffeine-config.mjs
# caffeine.toml must use bare mops install/build (sibling mops.toml present)
```
