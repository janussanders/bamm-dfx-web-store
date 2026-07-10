# BAMM dfx Web Store

Parallel Internet Computer storefront for BAMM, deployed with **dfx** (not Caffeine).

| | Caffeine production (unchanged) | This repo |
|--|----------------------------------|-----------|
| URL | `https://bamm-gw3.caffeine.xyz` | `https://&lt;frontend&gt;.icp0.io` after first IC deploy |
| Freeze | Stay on **v133.0.12** | Baseline **`v133.0.17`** + dfx spikes |
| Backend | `nae7q-…` | **New** empty canisters |
| Deploy | Caffeine UI | `dfx.json` + Actions ([docs/dfx-deploy.md](docs/dfx-deploy.md)) |

## Quick start

```bash
npx -y ic-mops@latest install && npx -y ic-mops@latest build
cd src/frontend && pnpm install && pnpm build
```

Live URL: add GitHub secret `DFX_IDENTITY_PEM` → Actions → **Deploy dfx (IC)** → `deploy=true`.

## What you do on the new URL

1. Open the dfx frontend URL  
2. Internet Identity → claim **Super Admin**  
3. Configure Stripe, RESEND, PEM, upload installers  
4. Same product shape as Caffeine — **separate data**

## DDRs

| DDR | Topic | Status |
|-----|--------|--------|
| [001](DDR/DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md) | Parallel path | Approved |
| [002](DDR/DDR-002-Dfx-Internet-Identity-Security.md) | II / security | Approved |
| [003](DDR/DDR-003-Dfx-Object-Storage-Replacement.md) | Blob storage spike | **Implemented (spike)** |
| [004](DDR/DDR-004-Dfx-CI-Deploy-Agentic-URL.md) | CI + agentic URL | **Implemented (build; deploy pending secrets)** |

## validate-snapshot?

**Not required** for dfx. Optional contracts check only — see [docs/dfx-deploy.md](docs/dfx-deploy.md).

## Status

- ✅ Motoko builds without Caffeine object-storage  
- ✅ Frontend ExternalBlob shim  
- ✅ `dfx.json` + deploy workflow  
- ⏳ Live IC URL (needs `DFX_IDENTITY_PEM`)  
- ⏳ ≥1 MiB installer round-trip on IC  
