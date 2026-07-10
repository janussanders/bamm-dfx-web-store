# DDR-011: Frontend `@caffeineai/object-storage` bindgen dependency

**Date:** 2026-07-06  
**Status:** Implemented  
**Related:** [DDR-009](DDR-009-Caffeine-Stale-Deploy-Cache.md), [DDR-008](DDR-008-LicenseSigner-Core-List-Not-Buffer.md)

## Problem

Caffeine frontend build failed:

```
[vite]: Rollup failed to resolve import "@caffeineai/object-storage" from "/src/frontend/src/backend.ts"
```

## Root cause

1. Backend `caffeine.toml` runs `pnpm bindgen` after `mops build`, regenerating `src/frontend/src/backend.ts`.
2. Current bindgen emits `import { ExternalBlob } from "@caffeineai/object-storage"` instead of an inline `ExternalBlob` class.
3. `src/frontend/package.json` listed `@caffeineai/core-infrastructure` only. **`@caffeineai/object-storage` was a transitive dependency** (via core-infrastructure).
4. **pnpm** (Caffeine default) does not hoist transitive packages for Vite/Rollup to resolve direct imports in `backend.ts`.

## Decision

- Add **`@caffeineai/object-storage@0.1.1`** as a **direct** dependency in `src/frontend/package.json` (pin matches `core-infrastructure@0.3.0`).
- Import and re-export `ExternalBlob` from the package in `backend.ts` (aligned with bindgen output).
- Run **`scripts/validate-frontend-bindgen-deps.mjs`** before `vite build` to catch missing direct deps early.

## Fix

```json
// src/frontend/package.json
"@caffeineai/object-storage": "0.1.1"
```

```typescript
// src/frontend/src/backend.ts (bindgen-aligned)
import { ExternalBlob } from "@caffeineai/object-storage";
export { ExternalBlob };
```

## Verification

```bash
node scripts/validate-frontend-bindgen-deps.mjs
cd src/frontend && pnpm build
```

## Prevention

- After bindgen upgrades, check `backend.ts` for new `@caffeineai/*` imports and add each to `src/frontend/package.json`.
- Run **`scripts/validate-frontend-preflight.mjs`** before Caffeine import (includes bindgen deps + typecheck + biome). See [DDR-012](DDR-012-Caffeine-Import-Preflight-Gates.md).
