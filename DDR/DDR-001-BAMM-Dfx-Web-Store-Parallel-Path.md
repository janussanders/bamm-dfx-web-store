# DDR-001: BAMM dfx Web Store — parallel path

**Date:** 2026-07-10  
**Status:** Approved (design)  
**Product:** BAMM dfx Web Store  
**Repo:** `janussanders/bamm-dfx-web-store`  
**Baseline:** `bamm-e-commerce-site` tag **`v133.0.17`** (`3599db3`)  
**Related:** [DDR-002](DDR-002-Dfx-Internet-Identity-Security.md), [DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md), [DDR-004](DDR-004-Dfx-CI-Deploy-Agentic-URL.md)

## Decision

1. **Caffeine production stays on v133.0.12** (working entitlements at `bamm-gw3.caffeine.xyz` / backend `nae7q-yaaaa-aaaai-atnvq-cai`). No reinstall, no promote from this repo.
2. This repository is a **second, independent storefront** deployed with **dfx + GitHub Actions**.
3. Opening the **new URL** shows a full storefront with the **same functionality** as Caffeine (Premium, Admin, licenses, entitlements). It starts **empty**: operator sets up Internet Identity, claims Super Admin, uploads assets, configures Stripe and email.
4. Target is **functional equivalence**, not a byte-identical Caffeine runtime (see DDR-003).

## Operator mental model

```
Caffeine URL  →  live customers / desktop production canister
Dfx URL       →  new empty store you bootstrap yourself
```

Data is **not** shared. Admins and purchases on Caffeine do not appear on dfx until deliberately recreated.

## Non-goals

- Hot-migrate `nae7q-…` state into dfx canisters
- Keep using Caffeine import/promote for this repo
- Point production desktop at dfx canisters without a future cutover DDR

## Next

Accept DDR-002–004 → spike DDR-003 → implement `dfx.json` + Actions (DDR-004).
