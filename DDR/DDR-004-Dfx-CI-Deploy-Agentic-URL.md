# DDR-004: GitHub Actions deploy & agentic test URL

**Date:** 2026-07-10  
**Status:** Implemented (build CI + optional deploy) — live URL pending secrets  
**Parent:** [DDR-001](DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md)  
**Runbook:** [docs/dfx-deploy.md](../docs/dfx-deploy.md)

## Goal

Deterministic Motoko + frontend build; optional IC deploy that prints an **agentic test URL**.

## Implemented

| Artifact | Path |
|----------|------|
| `dfx.json` | repo root — custom backend wasm from mops + assets frontend |
| Workflow | `.github/workflows/dfx-deploy.yml` — `workflow_dispatch` |
| Contracts CI | `.github/workflows/bamm-contracts-alignment.yml` — **manual only** (not required for dfx) |

### Pipeline

```
workflow_dispatch
        │
        ▼
  mops install + build → backend.wasm / backend.did
  pnpm build (src/frontend) → dist/
        │
        ├─ deploy=false → artifacts + build summary
        └─ deploy=true + DFX_IDENTITY_PEM
                │
                ▼
          dfx deploy --network ic
          Job summary: Agentic URL https://<frontend>.icp0.io
```

## Secrets

| Secret | Purpose |
|--------|---------|
| `DFX_IDENTITY_PEM` | Required only when `deploy=true` |

Never put Stripe/RESEND/license PEM in Actions — Admin UI after bootstrap (DDR-002).

## validate-snapshot

**Not required** for dfx. See [docs/dfx-deploy.md](../docs/dfx-deploy.md). Kept as optional `workflow_dispatch` for contract snapshot refresh.

## Hard rules

- Do **not** target Caffeine `nae7q-…`
- Agentic testing uses dfx URL only, not `bamm-gw3.caffeine.xyz`

## Operator checklist after first green deploy

1. Open agentic URL from Actions summary  
2. II login → Super Admin claim  
3. Configure Stripe (test), RESEND, PEM, installers  
4. Smoke: trial email, test checkout, Admin entitlements  
5. Commit generated `canister_ids.json` when ready to pin IDs (done for first IC create: backend `5z2v5-…`, frontend `5qz6b-…`)
