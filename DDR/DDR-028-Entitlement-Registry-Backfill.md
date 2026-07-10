# DDR-028: Entitlement registry backfill from premium purchases

**Date:** 2026-07-08  
**Status:** Approved  
**Related:** [docs/ddr/2026-07-07-networked-license-entitlement-activation.md](../docs/ddr/2026-07-07-networked-license-entitlement-activation.md), [DDR-016](DDR-016-PremiumPurchase-M0170-Check-Stable-Baseline.md), BAMM enterprise DDR networked activation

## Problem

After production deploy of networked entitlements (`v133.0.11+`), Admin → Purchases → **Entitlements** showed:

> No entitlements yet.

Premium Purchases still listed historical `paid_sent` rows with `entitlementId = —`.

### Root cause

| Store | Populated by | After v133 upgrade |
|-------|--------------|--------------------|
| `premiumPurchases` | Stripe / admin purchase recording | Migrated; `entitlementId` blanked to `""` |
| `entitlementsByEmail` | **Only** `upsertEntitlementFromPurchase` inside `fulfillPaidLicense` | **Empty** — no backfill |

`EntitlementMigration.mo` intentionally only adds the `entitlementId` field to purchases. It does **not** create `CustomerEntitlement` rows.

Desktop validates licenses locally and calls IC `activateEntitlement` only for **v2** grace licenses. Empty registry does not break v1 legacy licenses, but:

1. Admin cannot see / support networked entitlements
2. Any v2 grace license without a matching canister row fails activation (`Entitlement not found`)

## Decision

### Admin API: `backfillEntitlementsFromPurchases`

- Role: `#administrator` (and above)
- Iterates `premiumPurchases` oldest-first
- Eligible status: `paid_sent`, `paid`, `complete`, **`confirmed`** (live fulfillment often leaves rows at `confirmed` before/without flipping to `paid_sent`)
- Also eligible when `paymentConfirmation == "paid"`
- Skips: empty features; already non-empty `entitlementId`
- Calls existing `upsertEntitlementFromPurchase` (merge by email)
- Sets `PremiumPurchase.entitlementId`
- Workflow step: `purchase_backfilled`
- **Does not** re-email licenses
- Activation window starts at **backfill time** (not original purchase time) so historical purchases are not instantly `#forfeited`

### Admin UI

Entitlements tab: **Backfill from purchases** button + clearer empty-state copy.

### Desktop (BAMM)

**No code changes required** for this gap. Desktop already consumes v2 activation when a matching entitlement exists. After backfill, operators may optionally re-issue v2 grace licenses for customers who should activate on a machine; existing v1 licenses continue as `legacy` until expiry.

## Operator steps (production)

1. Deploy this change (tag after merge; Caffeine import + build + promote — DDR-027)
2. Admin → Purchases → Entitlements → **Backfill from purchases**
3. Confirm registry rows + purchase `entitlementId` links
4. Optional: re-issue networked licenses for customers who need desktop activation

## Pin docs on next release

Pinned on release tag **`v133.0.12`** (DDR-027 agentic workflow + this DDR-028).

## Verification

```bash
cd src/backend && npx -y ic-mops@latest build
# After deploy: backfill once; getEntitlementRegistry() non-empty when paid purchases exist
```

## Out of scope

- Auto-emailing new v2 licenses during backfill
- Trial license → entitlement (still legacy path)
- Changing desktop activation client

**Superseded:** Admin `generateLicense` / `sendManualLicense` → v2 entitlement is covered by [DDR-030](DDR-030-Admin-License-Management-V2.md).
