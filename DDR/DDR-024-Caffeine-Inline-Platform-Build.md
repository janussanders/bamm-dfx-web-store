# DDR-024: Caffeine Motoko sandbox — platform tools only (no sibling scripts)

**Date:** 2026-07-08  
**Status:** Approved  
**Supersedes (for Caffeine import paths):** [DDR-023](DDR-023-Caffeine-Backend-Sibling-Scripts.md), [DDR-022](DDR-022-Caffeine-Src-Toolchain-Layout.md) path strategy  
**Related:** [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md), [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md)

## Problem

**v133.0.8** failed on Caffeine import:

```
MODULE_NOT_FOUND: /caffeine-preflight.mjs
```

DDR-023 placed `caffeine-preflight.mjs` and `caffeine-mops.sh` beside `main.mo`. The Motoko build sandbox still could not resolve them — Node looked for `/caffeine-preflight.mjs` (sandbox root), not `src/backend/caffeine-preflight.mjs`.

This is the same class of failure as **v133.0.5** (`src/backend/scripts/` not materialized): **non-Motoko sibling files are not reliably present in the backend build execution environment.**

| Tag | Approach | Result |
|-----|----------|--------|
| v133.0.4–0.7 | `scripts/` / `../scripts/` paths | MODULE_NOT_FOUND |
| v133.0.8 | Sibling `.mjs` / `.sh` beside `main.mo` | MODULE_NOT_FOUND `/caffeine-preflight.mjs` |
| v119.0.3 / v133.0.1 | Bare `mops install` / `mops build` / `pnpm bindgen` | **Import build succeeded** |

## Decision

### Backend `src/backend/caffeine.toml` — platform tools only

```toml
[build]
commands = ["mops install", "mops build", "pnpm bindgen"]
```

No `node …`, no `bash …sh`, no `scripts/` paths in Caffeine backend commands.

### Frontend

- `[build]`: `rm -rf dist` + `pnpm build` (DDR-009)
- `package.json` `build`: `vite build && pnpm copy:env` — **no** preflight script on the Caffeine path
- Preflight remains **local-only** before tagging

### Local preflight (mandatory before tag)

```bash
node scripts/validate-backend-preflight.mjs
node scripts/validate-frontend-preflight.mjs
node scripts/validate-caffeine-config.mjs
npx -y ic-mops@latest build   # from repo root — enforces --default-persistent-actors + check-stable
```

Actor-shape / IC0503 guards stay in local scripts (DDR-017). Do **not** reintroduce them into `caffeine.toml` until Caffeine documents that arbitrary sibling files are synced into the Motoko sandbox.

### `src/mops.toml`

Keep under `src/` for tooling that runs with a full `src/` tree. Platform `mops` on Caffeine historically succeeded with bare commands (v119/v133.0.1); local builds from repo root remain SSOT for `[moc] args`.

## Import tag

**`v133.0.9`** — build init OK; upgrade IC0503. Superseded for deploy by **`v133.0.10`** ([DDR-025](DDR-025-Caffeine-Mops-From-Src.md)): mops must run from `src/` via `bash -c 'cd .. && mops …'`.

## Agent rules (extends DDR-021)

- **Do not** add `node caffeine-preflight.mjs`, `bash caffeine-mops.sh`, or any `scripts/` path to `src/backend/caffeine.toml`.
- **Do not** use bare `mops install` / `mops build` from `src/backend/` (IC0503 — DDR-017 §4 / DDR-025).
- **Do not** “fix” import by restoring DDR-022/023 script paths without a new DDR + proven Caffeine materialization.

## Verification

```bash
node scripts/validate-caffeine-config.mjs
# backend caffeine.toml must contain only: mops install, mops build, pnpm bindgen
```
