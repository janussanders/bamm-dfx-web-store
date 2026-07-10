# BAMM ↔ E-Commerce alignment

This storefront must stay aligned with **BAMM `@bamm/contracts`** in the [BAMM](https://github.com/janussanders/BAMM) monorepo.

## Source of truth

```
BAMM/packages/bamm-contracts/data/
  features.json              # ids, licenseReferenceName, IC productId, annual prices
  bundles.json               # checkout bundle SKUs
  tiers.json                 # subscription / BETA tiers
  license-canonical-names.json
  licensing-policy.json      # activation window, term-on-activate, machine binding (2026-07-07)
  license-payload-v2.schema.json
```

Enterprise DDRs: `BAMM/docs/ddr/enterprise/README.md`

## This repo

| Path | Purpose |
|------|---------|
| `contracts/canister-features.snapshot.json` | Committed snapshot of **live** IC Features Management (update when admin changes prices) |
| `contracts/canister-bundles.snapshot.json` | Committed snapshot of bundle SKUs aligned to `@bamm/contracts/data/bundles.json` |
| `.github/workflows/bamm-contracts-alignment.yml` | CI: validates both snapshots against BAMM contracts at pinned ref |

## When you change IC admin prices, features, or bundles

1. Update canister Features Management in admin UI when à la carte prices change.
2. Update `contracts/canister-features.snapshot.json` and/or `contracts/canister-bundles.snapshot.json`.
3. Open PR — CI checks out BAMM and runs `validate-ecommerce-snapshot.mjs`.
4. If BAMM contracts also need changing, open a **companion PR** in `janussanders/BAMM`.

Regenerate snapshots from BAMM when contracts change:

```bash
cd ../BAMM
node packages/bamm-contracts/scripts/sync-ecommerce-snapshots.mjs ../bamm-e-commerce-site
npm run contracts:validate:ecommerce -- ../bamm-e-commerce-site/contracts/canister-features.snapshot.json ../bamm-e-commerce-site/contracts/canister-bundles.snapshot.json
```

## P0 security

Do not ship commerce changes until `getPrivateKeyForSigning` is removed from public API. See BAMM `docs/ddr/enterprise/2026-06-18-legal-security-financial-liability-framework.md` (SEC-001).

## Local validation

```bash
git clone https://github.com/janussanders/BAMM.git ../BAMM
cd ../BAMM/packages/bamm-contracts && npm run validate
npm run validate:ecommerce -- \
  "$(pwd)/../../bamm-e-commerce-site/contracts/canister-features.snapshot.json" \
  "$(pwd)/../../bamm-e-commerce-site/contracts/canister-bundles.snapshot.json"
```

(Adjust paths to your local clone layout.)

## Multi-root workspace

Open `BAMM/BAMM-platform.code-workspace` in Cursor to edit both repos with shared contract context.
