# DDR: Tiered Bundle Licensing — E-Commerce Alignment

**Date:** 2026-07-03 (updated 2026-07-06)  
**Status:** Implemented  
**Type:** Commerce / Licensing  
**Companion (BAMM):** `docs/ddr/enterprise/2026-07-03-tiered-bundle-licensing-commerce-desktop-rollout.md`  
**Admin bundles:** `DDR/DDR-013-Admin-Bundle-Management.md`

## Decision

Align IC storefront `/premium` with BAMM `@bamm/contracts` bundle SKUs:

| Bundle ID | Marketing name | Price |
|-----------|----------------|------:|
| `complete_annual` | BAMM Complete | $349.99/yr |
| `planner_tax_annual` | Planner + Tax | $169.99/yr |
| `pro_annual` | Pro Bundle | $329.99/yr |
| `planner_annual` | Planner Bundle | $34.99/yr |

## Implementation (this repo)

- `contracts/canister-bundles.snapshot.json` — CI-validated bundle snapshot (structural SSOT for contracts sync)
- `src/backend/main.mo` — `licenseBundles` map, CRUD APIs, dynamic `expandLineItemToBammFeatures`
- `src/frontend/src/components/BundleManagementPanel.tsx` — admin UI under Features Management
- `src/frontend/src/pages/PremiumProducts.tsx` — loads active bundles from canister (snapshot fallback)
- `src/frontend/src/data/bundleCatalog.ts` — formatting helpers + snapshot fallback
- `.github/workflows/bamm-contracts-alignment.yml` — validates features + bundles snapshots

## Out of scope (Phase 2 follow-up)

- Multi-purchase license merge (union existing customer entitlements before re-issue)
- Stripe Billing subscription checkout for BAMM SERVICES Cloud tiers

## Validation

```bash
cd ../BAMM
npm run contracts:validate:ecommerce -- \
  ../bamm-e-commerce-site/contracts/canister-features.snapshot.json \
  ../bamm-e-commerce-site/contracts/canister-bundles.snapshot.json

node scripts/validate-frontend-preflight.mjs
```
