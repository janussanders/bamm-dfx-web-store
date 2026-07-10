# DDR-013: Admin Bundle Management (Features Management)

**Date:** 2026-07-06  
**Status:** Implemented  
**Type:** Commerce / Admin  

## Context

Tiered bundle SKUs (`complete_annual`, `planner_tax_annual`, `pro_annual`, `planner_annual`) were initially hardcoded in `contracts/canister-bundles.snapshot.json`, `bundleCatalog.ts`, `marketing.ts`, and `expandLineItemToBammFeatures` in `main.mo`. Marketing copy and pricing could not be changed without a redeploy.

## Decision

Store **license bundles** on the IC canister alongside license features. Admins manage bundles in **Features Management → Bundle Management**:

| Field | Purpose |
|-------|---------|
| `bundleId`, `name` | SKU identity; Stripe line item uses `name` |
| `priceInCentsAnnual` | Checkout price |
| `featureIds` | Included premium features (resolved to RSA `licenseReferenceName` at fulfillment) |
| `headline`, `bullets`, `badge` | Storefront marketing |
| `saveTextOverride` | Optional savings line; auto-computed from à la carte when empty |
| `disclaimer` | Regulated-module / legal copy on bundle card |
| `alaCarteSumCents`, `savingsCents` | Recomputed on save from live feature prices |
| `isActive`, `sortOrder` | Visibility and card order |

## Stripe / fulfillment path (unchanged schema)

1. **Checkout** — `PremiumProducts` sends one `ShoppingItem` per bundle with `productName: bundle.name`.
2. **Payment webhook / fulfillment** — `expandLineItemToBammFeatures` looks up `licenseBundles` by name or `bundleId`, then expands `featureIds` → canonical license reference names via `licenseFeatures`.
3. **Transaction logs, premium purchases, license records** — still store expanded `features: [Text]`; no schema migration.
4. **Hardcoded bundle strings** remain as fallback when canister bundles are empty (pre-migration).

## Defaults

`initializeDefaultLicenseBundles()` seeds four bundles aligned with `contracts/canister-bundles.snapshot.json` and prior `BUNDLE_COPY` marketing text.

**Initialize order:** run **Initialize Default Premium Features** first, then **Initialize Default Bundles**. Bundle includes use canister feature ids (`migration-management` for Database Management); the admin UI and storefront normalize contract alias `database_management` automatically.

**Feature id normalization:** bundle `featureIds` are canonicalized on save (backend + admin UI). Order summary and Stripe fulfillment always use `licenseReferenceName` values (e.g. `Paycheck Budget`, `Database Management`), never raw snake_case ids.

## Out of scope

- Desktop BAMM app runtime fetch of bundle marketing (desktop infers bundle label from licensed feature set via `scripts/available-features.json`).
- Contracts snapshot still validates structural alignment in CI; admin can diverge on marketing/pricing at runtime.

## Validation

```bash
node scripts/validate-frontend-preflight.mjs
cd src/frontend && pnpm build
```
