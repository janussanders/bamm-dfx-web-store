# DDR-016: PremiumPurchase M0170 — check-stable baseline vs stale `.old/`

**Date:** 2026-07-07  
**Status:** Implemented  
**Related:** [DDR-009](DDR-009-Caffeine-Stale-Deploy-Cache.md), [EntitlementMigration.mo](../src/backend/EntitlementMigration.mo), [docs/ddr/2026-07-07-networked-license-entitlement-activation.md](../docs/ddr/2026-07-07-networked-license-entitlement-activation.md)

## Problem

Caffeine import failed with **M0170** on `premiumPurchases`:

> Stable variable `premiumPurchases` type incompatibility — field `entitlementId` is missing from `PremiumPurchaseLegacy` type definition.

**Root cause:** `mops.toml` `[canisters.backend.check-stable]` pointed at **`.old/src/backend/dist/backend.most`**. After PR #26 (`ca3a3dc`) landed on `main` without a migration wrapper, a successful Caffeine workspace build wrote a `.old/` artifact whose `PremiumPurchase` **already included `entitlementId`**. PR #27 added `EntitlementMigration` expecting the **production** shape (no `entitlementId`). `check-stable` compared the new migration against stale `.old/` → false M0170.

**Production IC canister** (last tag `v119.0.3`) still stores purchases **without** `entitlementId`; `EntitlementMigration.migration` (Legacy → add `entitlementId = ""`) is correct for the live upgrade.

## Decision

1. Pin **check-stable** to a committed baseline: `scripts/check-stable/backend-v119.0.3.most` (generated from tag `v119.0.3`).
2. Regenerate via `node scripts/build-check-stable-baseline.mjs` when the production baseline tag changes.
3. Keep **`EntitlementMigration.migration`** (Legacy → New) for the live canister upgrade path.
4. Caffeine composer must still **clear `.old/`** before rebuild (DDR-009); pinned baseline prevents stale `.old/` from breaking `check-stable` when `.old/` cannot be deleted.

## Edge case: canister already on PR #26 shape

If a canister was upgraded with **`ca3a3dc`** ( `PremiumPurchase` includes `entitlementId`, no migration), a deploy using Legacy-input migration will fail on **IC upgrade** (not just check-stable). Symptom: same M0170 but during canister upgrade. **Recovery:** temporarily switch `main.mo` to identity migration on `PremiumPurchase` → `PremiumPurchase`, deploy once, then restore Legacy migration only if rolling back (unlikely).

Verify with `getEntitlementRegistry` on the canister: absent → production is pre-PR-26; present → use identity migration hotfix.

## Verification

```bash
pnpm validate:mops-lock
npx -y ic-mops@latest build   # must pass check-stable against scripts/check-stable/backend-v119.0.3.most
```

After Caffeine import: canister upgrade succeeds; Admin → Purchases → Entitlements; `getEntitlementRegistry` responds.
