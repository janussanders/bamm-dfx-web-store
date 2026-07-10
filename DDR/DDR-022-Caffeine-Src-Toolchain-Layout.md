# DDR-022: Caffeine VM layout — build toolchain under `src/`

**Date:** 2026-07-08  
**Status:** Approved  
**Related:** [DDR-009](DDR-009-Caffeine-Stale-Deploy-Cache.md), [DDR-020](DDR-020-Caffeine-Workspace-Include-Scripts.md), [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md)

## Problem

**v133.0.6** still failed on Caffeine import:

```
MODULE_NOT_FOUND: /home/ubuntu/scripts/validate-backend-preflight.mjs
```

Despite `caffeine.toml` workspace `include` listing `scripts/**`, the Caffeine import VM **does not materialize repo-root files**. [DDR-009](DDR-009-Caffeine-Stale-Deploy-Cache.md) confirmed the workspace only reliably contains **`src/`**.

| Attempt | Path | Result |
|---------|------|--------|
| v133.0.4 | `../../scripts/` from `src/backend` | Repo-root `scripts/` not on VM |
| v133.0.5 | `src/backend/scripts/` | Subdir not materialized |
| v133.0.6 | `../../scripts/` + workspace include | Include ignored; same MODULE_NOT_FOUND |

## Decision

Duplicate the **Caffeine build toolchain under `src/`**, which is always present on import:

```
src/
  mops.toml              # paths relative to src/ (backend/main.mo, etc.)
  mops.lock
  package.json           # bindgen only
  scripts/
    validate-backend-preflight.mjs
    validate-mops-lock.mjs
    caffeine-mops.sh
    validate-frontend-preflight.mjs
    validate-frontend-bindgen-deps.mjs
    check-stable/backend-02c10d9.most
  backend/caffeine.toml  # ../scripts/...
  frontend/
```

Repo-root `scripts/` and `mops.toml` remain for **local dev from repo root**. Before tagging, run:

```bash
node scripts/sync-caffeine-src-toolchain.mjs
node scripts/validate-caffeine-config.mjs
cd src/backend && node ../scripts/validate-backend-preflight.mjs
```

## Locked backend commands (Caffeine cwd: `src/backend`)

```
node ../scripts/validate-backend-preflight.mjs
bash ../scripts/caffeine-mops.sh install
bash ../scripts/caffeine-mops.sh build
bash -c 'cd .. && pnpm bindgen'
```

**Do not** revert to `../../scripts/` — that resolves outside the materialized `src/` tree.

## Agent rules (extends DDR-021)

- **Do not** “fix” import by moving scripts back to repo root or `src/backend/scripts/`.
- **Do not** remove `src/mops.toml` or `src/scripts/`.
- Sync `src/mops.lock` from repo root when `[dependencies]` change (DDR-010).
- Import tag: **`v133.0.7`**.

## Verification

Simulate Caffeine backend cwd:

```bash
cd src/backend && node ../scripts/validate-backend-preflight.mjs
cd src/frontend && node ../scripts/validate-frontend-preflight.mjs
```

## Consequences

- Dual toolchain: repo root (local) + `src/` (Caffeine). Keep `[dependencies]` in sync.
- DDR-021 updated; `validate-caffeine-config.mjs` checks `src/scripts/` layout.
