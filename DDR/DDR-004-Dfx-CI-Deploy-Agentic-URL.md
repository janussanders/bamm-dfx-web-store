# DDR-004: GitHub Actions deploy & agentic test URL

**Date:** 2026-07-10  
**Status:** Approved (design) — implement after DDR-003 spike  
**Parent:** [DDR-001](DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md)

## Goal

Every push (or tag) to this repo can deploy a **deterministic** IC frontend + backend and print a **URL for agentic testing**.

## Proposed pipeline

```
push / workflow_dispatch / tag dfx-v*
        │
        ▼
  mops build (moc 1.8.2, --default-persistent-actors)
  pnpm frontend build
  candid / actor generate
        │
        ▼
  dfx deploy --network ic   (or staging network)
        │
        ▼
  Job summary:
    Backend canister ID:  …
    Frontend canister ID: …
    Agentic URL: https://<frontend-canister-id>.icp0.io
```

## Secrets (GitHub Actions)

| Secret | Purpose |
|--------|---------|
| `DFX_IDENTITY_PEM` (or encrypted identity) | Deploy controller |
| Cycles wallet / top-up as required | Canister compute |
| Optional custom domain token | Later |

**Never** store Stripe/RESEND/PEM production secrets in Actions — those are uploaded via Admin UI after deploy (DDR-002).

## Hard rules

- Workflow must **not** target Caffeine production canister `nae7q-…`  
- Canister IDs for this store live only in this repo’s `canister_ids.json` (generated)  
- Agentic testing uses the **dfx URL**, not `bamm-gw3.caffeine.xyz`

## Operator checklist after first green deploy

1. Open agentic URL from Actions summary  
2. II login → Super Admin claim  
3. Configure Stripe (test), RESEND, PEM, installers  
4. Smoke: trial email, test checkout, Admin entitlements tab  

## Out of scope for v1 Actions

- Automatic custom domain  
- Production desktop canister switch  
- State migration from Caffeine  
