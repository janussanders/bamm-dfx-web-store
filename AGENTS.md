# AGENTS.md — BAMM dfx Web Store

## What this repo is

Parallel **dfx** storefront for BAMM. **Not** the Caffeine production app.

- Caffeine prod: `bamm-e-commerce-site` / `bamm-gw3.caffeine.xyz` / stay on **v133.0.12**
- This repo: empty canisters, new URL, operator bootstrap (II + Admin config)

## Before coding

Read:

1. [DDR-001](DDR/DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md)  
2. [DDR-002](DDR/DDR-002-Dfx-Internet-Identity-Security.md)  
3. [DDR-003](DDR/DDR-003-Dfx-Object-Storage-Replacement.md) — **blocker**  
4. [DDR-004](DDR/DDR-004-Dfx-CI-Deploy-Agentic-URL.md)  

## Rules

- Do **not** deploy to or reinstall Caffeine production `nae7q-yaaaa-aaaai-atnvq-cai`
- Do **not** assume Caffeine `caffeine.toml` locks apply here long-term
- First engineering work = DDR-003 storage spike, then `dfx.json` + Actions
- Prefer functional parity with Caffeine storefront, not Caffeine platform APIs
