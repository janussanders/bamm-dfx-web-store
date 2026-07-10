# DDR-012: Caffeine import preflight gates (frontend + backend)

**Date:** 2026-07-06  
**Status:** Implemented  
**Related:** [DDR-009](DDR-009-Caffeine-Stale-Deploy-Cache.md), [DDR-010](DDR-010-Mops-Lock-Deps-Hash-Mismatch.md), [DDR-011](DDR-011-Frontend-Object-Storage-Bindgen-Dependency.md), [DDR-020](DDR-020-Caffeine-Workspace-Include-Scripts.md)

## Problem

Caffeine import fails late in the pipeline for issues that are cheap to catch locally:

| Failure | Stage | DDR |
|---------|-------|-----|
| `mops.lock` hash mismatch | Backend `mops install` | DDR-010 |
| Motoko `LicenseSigner` Blob vs `[Nat8]` | Backend `mops build` | DDR-008 |
| `Text.contains` without `#text` variant | Backend `mops build` | This DDR |
| `List.toArray(list)` instead of `list.toArray()` | Backend `mops build` | This DDR |
| Missing `fulfillPaidLicense` in Candid bindgen | `/payment-success` stalls at `checkout_created` | DDR-004 |
| Vite cannot resolve `@caffeineai/object-storage` | Frontend `vite build` | DDR-011 |
| `tsc`: missing `useState` / icon imports | Frontend `pnpm typecheck` | — |
| Biome `lint/style/useTemplate` | Frontend `pnpm check` | This DDR |

Caffeine **`[build]`** for frontend runs `pnpm build` only. **`[check]`** runs `typecheck` + `biome check` separately — if import skips check or build runs first with stale code, failures surface as import errors.

## Decision

### Backend preflight (repo root)

```bash
pnpm validate:caffeine-config       # locked paths — DDR-021; run first
pnpm validate:mops-lock             # or: node scripts/validate-mops-lock.mjs
node scripts/validate-backend-preflight.mjs   # actor shape + --default-persistent-actors (DDR-017)
npx -y ic-mops@latest install
npx -y ic-mops@latest build
```

Agents: **do not edit** `caffeine.toml` to pass preflight — see [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md).

Wired into root `pnpm build`, `pnpm check`, and `src/backend/caffeine.toml` `[build]` / `[check]` (via `../../scripts/validate-backend-preflight.mjs` + `caffeine-backend-build.sh` — DDR-020).

### Frontend preflight (single command)

```bash
node scripts/validate-frontend-preflight.mjs
```

Runs, in order:

1. `scripts/validate-frontend-bindgen-deps.mjs` — direct `@caffeineai/*` deps for bindgen
2. `pnpm typecheck` in `src/frontend/` — TypeScript (`tsc --noEmit`)
3. `pnpm check` in `src/frontend/` — Biome (`biome check src`)

### Frontend build gate

`src/frontend/package.json` **`build`** runs preflight before Vite:

```
validate-frontend-preflight → vite build → copy:env
```

So Caffeine frontend **`[build]`** cannot succeed with lint or type errors.

### Caffeine.toml alignment

`src/frontend/caffeine.toml`:

- **`[check]`** — `node ../../scripts/validate-frontend-preflight.mjs`
- **`[build]`** — `rm -rf dist && pnpm build` (preflight inside `pnpm build`)

## Fixes in this DDR (Biome `useTemplate`)

- `src/pages/PaymentSuccess.tsx` — template literal for `PAYMENT_PENDING_MESSAGE`
- `src/legal/copy.ts` — template literal for refund contact paragraph

## Local workflow (before every push / tag)

```bash
# Repo root — full stack
pnpm validate:mops-lock
node scripts/validate-frontend-preflight.mjs
npx -y ic-mops@latest build
cd src/frontend && pnpm build

# Or shorthand
pnpm check && pnpm build
```

## Prevention checklist

- [ ] `mops.toml` changed → regenerate `mops.lock` (DDR-010)
- [ ] `backend.ts` bindgen import added → add direct dep in `src/frontend/package.json` (DDR-011)
- [ ] New React hooks/icons in pages → import from `react` / `lucide-react` (caught by `typecheck`)
- [ ] String + variable → prefer template literals (caught by `biome check`)
- [ ] Motoko `text.contains(sub)` → use `text.contains(#text sub)` when `sub` is a `Text` value (moc 1.8+)
- [ ] Run `node scripts/validate-frontend-preflight.mjs` before tagging for Caffeine
