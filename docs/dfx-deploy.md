# Dfx deploy & agentic URL

**Related:** [DDR-003](../DDR/DDR-003-Dfx-Object-Storage-Replacement.md), [DDR-004](../DDR/DDR-004-Dfx-CI-Deploy-Agentic-URL.md), [DDR-005](../DDR/DDR-005-Dfx-Chunked-Installer-Upload.md), [DDR-006](../DDR/DDR-006-Dfx-EOP-Actor-Field-Append-Order.md), [DDR-007](../DDR/DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md), [DDR-008](../DDR/DDR-008-Dfx-Primary-Caffeine-Backup.md), [DDR-009](../DDR/DDR-009-Custom-Domain-Bammservice.md), [DDR-010](../DDR/DDR-010-Email-Banner-Resend-Status.md)

## Failure map

| Symptom | DDR |
|---------|-----|
| Installer upload bar → 100%, nothing stored | [DDR-005](../DDR/DDR-005-Dfx-Chunked-Installer-Upload.md) |
| `Memory-incompatible program upgrade` (IC0503) on backend | [DDR-006](../DDR/DDR-006-Dfx-EOP-Actor-Field-Append-Order.md) + [DDR-038](../DDR/DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md) |
| Keyring hang, cycles, pnpm/vite deploy, no admin after II | [DDR-007](../DDR/DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md) |

## Deploy target cheat sheet (agents)

| `canisters=` | When | Notes |
|--------------|------|-------|
| **`frontend`** (default for UI) | React/Admin/landing/copy | Clears frontend→backend dep so Motoko is not touched |
| `backend` / `all` | New Motoko APIs or appended persistent fields | May IC0503 if live layout is frozen |
| On IC0503 | Stop; ship frontend-only; escalate reinstall | Not fixed by cycles top-up |

See [DDR-038](../DDR/DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md).

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

4. Open that URL → Internet Identity → **claim Super Admin** (there is no Caffeine “container system admin” on dfx):

   - Go to `https://<frontend>.icp0.io/admin-claim` (must be signed in with II)
   - One-time claim code (readable while no admins exist yet):

   ```bash
   dfx canister call backend getSuperAdminClaimCode --network ic --identity anonymous --query
   ```

   - Enter name, email, and the `BAMM…` code → you become Super Admin → `/admin` works
   - Then configure Stripe / RESEND / PEM / installers; invite other admins from Admin

Until the secret exists and the identity is funded, run the workflow with `deploy=false` to verify **build-only** CI.

## Hard rules

- Never deploy to Caffeine production `nae7q-yaaaa-aaaai-atnvq-cai`
- Parallel store starts **empty** — not a mirror of `bamm-gw3`
- After `pnpm bindgen`, re-apply `dfxExternalBlob` patches in `backend.ts` (DDR-003)

## Status (2026-07-10)

| Item | Status |
|------|--------|
| DDR-003 / DDR-005 chunked installers | Implemented + live (reinstall shipped chunk APIs) |
| `dfx.json` vite asset build | Done (avoid pnpm TTY in dfx — DDR-007) |
| CI build + optional deploy | Live |
| Live IC URL | https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io (backend `5z2v5-…`) |
| EOP field append lock | [DDR-006](../DDR/DDR-006-Dfx-EOP-Actor-Field-Append-Order.md) |
| Ops pitfalls | [DDR-007](../DDR/DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md) |
| Primary vs Caffeine backup | [DDR-008](../DDR/DDR-008-Dfx-Primary-Caffeine-Backup.md) |
| Custom domain (`bammservice.com`) | [DDR-009](../DDR/DDR-009-Custom-Domain-Bammservice.md) |
| Email banner false negative | [DDR-010](../DDR/DDR-010-Email-Banner-Resend-Status.md) |
| ≥1 MiB / full DMG·EXE round-trip | Operator verify after Super Admin re-claim |
