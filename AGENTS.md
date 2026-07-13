# AGENTS.md — BAMM dfx Web Store

## What this repo is

Parallel **dfx** storefront for BAMM. **Not** the Caffeine production app.

- Caffeine prod: `bamm-e-commerce-site` / `bamm-gw3.caffeine.xyz` (backup / freeze)
- This repo: live brand storefront at https://store.bammservice.com (frontend `5xyyv-…`, backend `5z2v5-…`)

## Before coding

Read:

1. [DDR-001](DDR/DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md)  
2. [DDR-002](DDR/DDR-002-Dfx-Internet-Identity-Security.md)  
3. [DDR-003](DDR/DDR-003-Dfx-Object-Storage-Replacement.md)  
4. [DDR-004](DDR/DDR-004-Dfx-CI-Deploy-Agentic-URL.md)  
5. [DDR-006](DDR/DDR-006-Dfx-EOP-Actor-Field-Append-Order.md) + [DDR-038](DDR/DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md) — **IC0503 / deploy targets**  
6. [docs/dfx-deploy.md](docs/dfx-deploy.md)

## Deploy rules (IC0503)

**Default:** `canisters=frontend` for UI/Admin/landing changes.

| Target | Use when |
|--------|----------|
| `frontend` | Copy, React, Admin UX, asset-only — **always try this first** |
| `backend` / `all` | Motoko API or new persistent state (append-only fields — DDR-006) |
| On **IC0503** | Stop retrying `all`. Ship frontend-only. Escalate operator **reinstall** or Motoko migration — do not treat as cycles or Caffeine `redeploy_draft`. |

```bash
gh workflow run "Deploy dfx (IC)" -f network=ic -f deploy=true -f canisters=frontend
```

Full decision tree: [DDR-038](DDR/DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md).

## Rules

- Do **not** deploy to or reinstall Caffeine production `nae7q-yaaaa-aaaai-atnvq-cai`
- Do **not** reinstall dfx backend without explicit operator approval (wipes admins/secrets/installers)
- Do **not** assume Caffeine `caffeine.toml` locks apply here long-term
- Prefer functional parity with Caffeine storefront, not Caffeine platform APIs
