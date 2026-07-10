# Dfx deploy & agentic URL

**Related:** [DDR-003](../DDR/DDR-003-Dfx-Object-Storage-Replacement.md), [DDR-004](../DDR/DDR-004-Dfx-CI-Deploy-Agentic-URL.md)

## validate-snapshot — is it necessary?

**No** for dfx build/deploy.

| Job | Purpose | Required for dfx? |
|-----|---------|-------------------|
| `validate-snapshot` (contracts alignment) | Diff `contracts/*.snapshot.json` vs BAMM `@bamm/contracts` | **No** — optional pricing SSOT |
| `Deploy dfx (IC)` | mops + frontend build; optional IC deploy | **Yes** (this path) |

`validate-snapshot` failed on this orphan repo because it pinned a deleted/stale BAMM branch (`feat/tiered-bundle-licensing-rollout`). It is now **manual only** (`workflow_dispatch`). Re-run when you intentionally refresh contract snapshots against `BAMM` `main`.

## Local build (no dfx binary required for compile)

```bash
cd /Users/janussanders/bamm-dfx-web-store
npx -y ic-mops@latest install
npx -y ic-mops@latest build          # → src/backend/dist/backend.{wasm,did}
cd src/frontend && pnpm install && pnpm build
```

Install dfx when ready to deploy: https://internetcomputer.org/docs/building-apps/developer-tools/dfx/

```bash
dfx start --background          # local
dfx deploy --network local
# Frontend: http://<frontend-canister>.localhost:4943
```

## GitHub Actions → live test URL

1. Install dfx locally (once), then run the secret helper (creates gitignored `.secrets/` PEM + uploads `DFX_IDENTITY_PEM`):

```bash
./scripts/setup-dfx-ci-secret.sh
```

Details + **how to fund cycles**: [dfx-ci-identity.md](dfx-ci-identity.md).

2. Actions → **Deploy dfx (IC)** → Run workflow:
   - `network`: `ic`
   - `deploy`: `true`
3. Job summary prints:

```text
Agentic URL: https://<frontend-canister-id>.icp0.io
```

4. Open that URL → Internet Identity → claim Super Admin → configure Stripe / RESEND / PEM / installers (DDR-002).

Until the secret exists and the identity is funded, run the workflow with `deploy=false` to verify **build-only** CI.

## Hard rules

- Never deploy to Caffeine production `nae7q-yaaaa-aaaai-atnvq-cai`
- Parallel store starts **empty** — not a mirror of `bamm-gw3`
- After `pnpm bindgen`, re-apply `dfxExternalBlob` patches in `backend.ts` (DDR-003)

## Status (2026-07-10)

| Item | Status |
|------|--------|
| DDR-003 Blob spike / mops build | Done |
| `dfx.json` | Added |
| CI build + optional deploy | Added |
| Live IC URL | Canisters created — backend `5z2v5-…`, frontend `5qz6b-…`; redeploy after pnpm assets build fix |
| ≥1 MiB installer round-trip | Pending after first green deploy |
