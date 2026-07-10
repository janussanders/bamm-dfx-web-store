# DDR-023: Caffeine backend sibling scripts (flat beside main.mo)

**Date:** 2026-07-08  
**Status:** Superseded by [DDR-024](DDR-024-Caffeine-Inline-Platform-Build.md)  
**Related:** [DDR-022](DDR-022-Caffeine-Src-Toolchain-Layout.md), [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md)

## Supersession

**v133.0.8** still failed: `MODULE_NOT_FOUND: /caffeine-preflight.mjs`. Sibling `.mjs`/`.sh` beside `main.mo` are **not** present in the Motoko build sandbox. Use DDR-024 (bare `mops` / `pnpm` only).

## Original problem (historical)

**v133.0.7** failed on Caffeine import with `MODULE_NOT_FOUND` for workspace `scripts/`. Repo-root and `../scripts/` paths are Cursor local-dev artifacts, not valid on import.

## Original decision (do not re-apply)

Place backend build scripts flat beside `main.mo` — **rejected by v133.0.8 evidence**.

## Import tag

Use **`v133.0.9`** (DDR-024), not `v133.0.8`.
