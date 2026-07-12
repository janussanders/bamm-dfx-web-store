# DDR-001: BAMM dfx Web Store — parallel path

**Date:** 2026-07-10  
**Status:** Approved (design)  
**Product:** BAMM dfx Web Store  
**Repo:** `janussanders/bamm-dfx-web-store`  
**Baseline:** `bamm-e-commerce-site` tag **`v133.0.17`** (`3599db3`)  
**Related:** [DDR-002](DDR-002-Dfx-Internet-Identity-Security.md), [DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md), [DDR-004](DDR-004-Dfx-CI-Deploy-Agentic-URL.md), [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md), [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md), [DDR-007](DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md), [DDR-008](DDR-008-Dfx-Primary-Caffeine-Backup.md), [DDR-009](DDR-009-Custom-Domain-Bammservice.md)

## Decision

1. ~~Caffeine production stays sole customer path~~ → **Superseded for development priority by [DDR-008](DDR-008-Dfx-Primary-Caffeine-Backup.md):** dfx is **primary**; Caffeine **v133.0.12** is **backup** (`bamm-gw3` / `nae7q-…`). Do not iterate Caffeine unless restoring backup.
2. This repository is the **active** storefront deployed with **dfx + GitHub Actions**.
3. Opening the **dfx / future bammservice.com URL** shows the full storefront (Premium, Admin, licenses, entitlements). Bootstrap: Internet Identity → Super Admin claim → Stripe / RESEND / PEM / installers.
4. Target is **functional equivalence**, not a byte-identical Caffeine runtime (see DDR-003).
5. Brand DNS cutover: [DDR-009](DDR-009-Custom-Domain-Bammservice.md).

## Operator mental model

```
Dfx URL / future bammservice.com  →  primary (develop & operate here)
Caffeine bamm-gw3                 →  backup only (frozen)
```

Data is **not** shared with Caffeine unless deliberately recreated.

## Non-goals

- Hot-migrate `nae7q-…` state into dfx canisters
- Keep using Caffeine import/promote for this repo
- Point production desktop at dfx canisters without a future cutover DDR

## Next

Accept DDR-002–004 → spike DDR-003 → implement `dfx.json` + Actions (DDR-004).
