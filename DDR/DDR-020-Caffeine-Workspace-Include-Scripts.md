# DDR-020: Caffeine workspace include + src-local build script paths

**Date:** 2026-07-08  
**Status:** Implemented  
**Related:** [DDR-012](DDR-012-Caffeine-Import-Preflight-Gates.md), [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md), [DDR-018](DDR-018-Caffeine-Import-Runbook.md), [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md)

## Problem

Caffeine import of **`v133.0.4`** failed during backend build:

```
MODULE_NOT_FOUND: /home/ubuntu/scripts/validate-backend-preflight.mjs
```

`src/backend/caffeine.toml` invoked `node ../../scripts/validate-backend-preflight.mjs` with cwd `src/backend`. That resolves to repo-root `scripts/`, but root `caffeine.toml` had:

```toml
[workspace]
include = ["src/**"]
```

Caffeine materializes only matched paths into the build VM. Repo-root **`scripts/`**, **`mops.toml`**, and **`mops.lock`** were **not** in the workspace sync → preflight and mops builds could not find required files.

**Follow-up (v133.0.5):** Moving launchers to `src/backend/scripts/` and invoking `bash scripts/run-backend-preflight.sh` also failed — Caffeine does **not** materialize that subdirectory. Error: `scripts/run-backend-preflight.sh: No such file or directory`.

## Decision

### 1. Expand workspace include (root `caffeine.toml`)

```toml
[workspace]
include = [
  "src/**",
  "scripts/**",
  "mops.toml",
  "mops.lock",
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
]
```

### 2. Repo-root `scripts/` paths in `caffeine.toml` (not `src/backend/scripts/`)

Caffeine runs backend commands with cwd `src/backend` but **does not sync** arbitrary subdirs like `src/backend/scripts/` into the build VM. Preflight and mops must stay in repo-root `scripts/` (included via workspace `scripts/**`) and be invoked as `../../scripts/...` from `src/backend/caffeine.toml`.

| Script | Path |
|--------|------|
| Backend preflight | `scripts/validate-backend-preflight.mjs` |
| Repo-root mops | `scripts/caffeine-backend-build.sh` |
| Frontend preflight | `scripts/validate-frontend-preflight.mjs` |

`src/backend/scripts/` launchers were removed from the Caffeine build path in v133.0.6 — they are not materialized on import.

### 3. Release tag

Import **`v133.0.6`** — not `v133.0.5` (broken `src/backend/scripts/` paths).

## Verification

```bash
node ../../scripts/validate-backend-preflight.mjs   # from src/backend (Caffeine cwd)
node ../../scripts/validate-frontend-preflight.mjs    # from src/frontend
```

Both must pass before tagging.

## Failure recovery

| Error | Fix |
|-------|-----|
| `MODULE_NOT_FOUND` … `/home/ubuntu/scripts/validate-backend-preflight.mjs` | Import **`v133.0.6`** (workspace include — this DDR) |
| `scripts/run-backend-preflight.sh: No such file or directory` | Import **`v133.0.6`** — v133.0.5 used unsynced `src/backend/scripts/` |
| `mops.toml not found` at repo root | Confirm workspace include lists `mops.toml` / `scripts/**` |
