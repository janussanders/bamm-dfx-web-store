# BAMM dfx Web Store

Parallel Internet Computer storefront for BAMM, deployed with **dfx** (not Caffeine).

| | Caffeine production (unchanged) | This repo |
|--|----------------------------------|-----------|
| URL | `https://bamm-gw3.caffeine.xyz` | New URL after first dfx deploy (e.g. `https://&lt;frontend&gt;.icp0.io`) |
| Freeze | Stay on **v133.0.12** (working entitlements) | Baseline source: **`v133.0.17`** from `bamm-e-commerce-site` |
| Backend | `nae7q-yaaaa-aaaai-atnvq-cai` | **New** canister IDs (empty at genesis) |
| Deploy | Caffeine UI | dfx + GitHub Actions (planned) |

## What you do on the new URL

1. Open the dfx frontend URL  
2. Sign in with **Internet Identity** (same II network as Caffeine)  
3. Claim **Super Admin**  
4. Configure Stripe, email (RESEND), license PEM, upload installers  
5. Exercise Premium / Admin / entitlements — same product shape, **separate data**

## Design DDRs (read first — no cutover yet)

| DDR | Topic |
|-----|--------|
| [DDR-001](DDR/DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md) | Parallel path, prod freeze, repo scope |
| [DDR-002](DDR/DDR-002-Dfx-Internet-Identity-Security.md) | II, admin accounts, secrets |
| [DDR-003](DDR/DDR-003-Dfx-Object-Storage-Replacement.md) | Replace Caffeine blob gateway (blocker) |
| [DDR-004](DDR/DDR-004-Dfx-CI-Deploy-Agentic-URL.md) | GitHub Actions → dfx → test URL |

Implementation starts only after DDR-003 spike proves portable storage.

## Source lineage

- Forked from [`janussanders/bamm-e-commerce-site`](https://github.com/janussanders/bamm-e-commerce-site) tag **`v133.0.17`** (`3599db3`)
- Caffeine-era README preserved as [`README.caffeine-source.md`](README.caffeine-source.md)

## Status

**Design / scaffolding.** Caffeine `caffeine.toml` files remain in tree until the dfx spike removes platform-only deps. Do not point production desktop at this repo’s canisters until an explicit cutover DDR.
