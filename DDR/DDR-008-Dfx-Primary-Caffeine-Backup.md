# DDR-008: Dfx store as primary development path (Caffeine backup)

**Date:** 2026-07-12  
**Status:** Approved  
**Parent:** [DDR-001](DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md)  
**Supersedes (intent):** DDR-001 “Caffeine stays sole customer path” for **future development** — Caffeine remains **backup / freeze**, not the active build target.  
**Related:** [DDR-007](DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md), [DDR-009](DDR-009-Custom-Domain-Bammservice.md)

## Decision

| Role | System | URL / canister |
|------|--------|----------------|
| **Primary (all future storefront + entitlement store work)** | **BAMM dfx Web Store** | https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io · backend `5z2v5-uqaaa-aaaao-bbeaq-cai` · repo `bamm-dfx-web-store` |
| **Backup (frozen / last-resort)** | Caffeine production | `bamm-gw3.caffeine.xyz` · backend `nae7q-yaaaa-aaaai-atnvq-cai` · freeze tag **v133.0.12** |

1. New features, admin fixes, installer hosting, Stripe/RESEND, and licensing changes land in **`bamm-dfx-web-store`** first.
2. **Do not** invest in Caffeine import/promote/tag train unless restoring backup after a dfx outage.
3. Desktop production cutover for **entitlement activation** defaults to dfx canister IDs (opaque `.icp0.io` env discovery — see BAMM `docs/ddr/licensing/2026-07-13-desktop-entitlement-dfx-canister-obscurity.md`). Brand-domain II/env (`store.bammservice.com`) remains [DDR-009](DDR-009-Custom-Domain-Bammservice.md) Step 4.
4. Custom domain **`store.bammservice.com`** → dfx frontend is [DDR-009](DDR-009-Custom-Domain-Bammservice.md) (Option A).

## Operator mental model (updated)

```
Dfx URL / future bammservice.com  →  primary store (develop & operate here)
Caffeine bamm-gw3                 →  backup only (do not iterate)
```

## Agent locks

- Default workspace / PRs for storefront: **`bamm-dfx-web-store`**.
- Do not open companion “Caffeine import” runbooks unless the operator asks to restore backup.
- Never deploy dfx tooling at Caffeine canister `nae7q-…`.

## Consequence

Parallel-path experiment is over: dfx is the active product surface for the IC store; Caffeine is retained as a safety net until desktop + DNS cutover complete.
