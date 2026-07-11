# DDR-007: CI identity, cycles, and deploy pitfalls

**Date:** 2026-07-10  
**Status:** Implemented (process lock)  
**Parent:** [DDR-004](DDR-004-Dfx-CI-Deploy-Agentic-URL.md)  
**Runbooks:** [docs/dfx-deploy.md](../docs/dfx-deploy.md), [docs/dfx-ci-identity.md](../docs/dfx-ci-identity.md)

## Purpose

Capture mainnet/dfx operational failures from the first live deploy so agents and operators do not repeat them.

## Pitfalls and mitigations

### 1. Keyring identity hangs in non-interactive agents

| Symptom | Cause | Mitigation |
|---------|--------|------------|
| `dfx` stalls with no output after deprecation banner | `bamm-dfx-ci` uses **keyring** storage; agent/CI cannot unlock Keychain | Use plaintext PEM identity for automation: GitHub secret `DFX_IDENTITY_PEM`, or local `ci-local` from `.secrets/dfx-ci-identity.pem` + `DFX_WARNING=-mainnet_plaintext_identity` |
| Setup script | Prefer keyring for humans | `scripts/setup-dfx-ci-secret.sh` exports PEM to gitignored `.secrets/` for Actions only |

**Lock:** Do not rely on keyring-backed identities inside Cursor agent / GitHub Actions shells.

### 2. Cycles: create fee vs install headroom

| Symptom | Cause | Mitigation |
|---------|--------|------------|
| `Insufficient cycles to create the canister` | Default create deposit too large for balance | `dfx canister create … --with-cycles <N>` (workflow pins deposits) |
| Create OK, install: `out of cycles` / need ~0.4 TC more | Subnet **creation fee** consumes most of `--with-cycles`; canister balance left ~0.2 TC | Top up before install: `dfx cycles top-up backend …`; budget **≥2 ICP** converted for first create+install of backend+frontend |
| Measured (2026-07-10) | ~0.99 ICP → ~1.66 TC; two creates left ~0.26 TC in ledger and ~0.2 TC per empty canister | See [dfx-ci-identity.md](../docs/dfx-ci-identity.md) |

**Lock:** After create, always `dfx cycles balance` + `dfx canister status` before assuming install will work.

### 3. Frontend build in `dfx deploy`

| Symptom | Cause | Mitigation |
|---------|--------|------------|
| `npm error No workspaces found: --workspace=src/frontend` | `dfx.json` `"workspace"` uses npm workspaces | Use explicit build command (not npm workspace) |
| `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` / allowBuilds | `pnpm --dir src/frontend build` triggers install gates in CI/agent | `dfx.json` frontend build: `cd src/frontend && ./node_modules/.bin/vite build && cp env.json dist/` (deps installed in workflow step first) |

**Lock:** Do not restore `"workspace": "src/frontend"` or bare `pnpm build` as the only dfx asset build without CI=true / preinstalled `node_modules`.

### 4. No Caffeine “container system admin”

| Symptom | Cause | Mitigation |
|---------|--------|------------|
| II login works; `/admin` denies access | Empty canister; no platform system admin | Claim via `/admin-claim` + `getSuperAdminClaimCode` while no active admins exist ([DDR-002](DDR-002-Dfx-Internet-Identity-Security.md)) |

```bash
dfx canister call backend getSuperAdminClaimCode --network ic --identity anonymous --query
```

### 5. Pin canister IDs

Commit `canister_ids.json` after first successful create (backend `5z2v5-…`, frontend `5xyyv-…`). Recreating frontend without the pin allocates a **new** ID and breaks bookmarks / II derivation origin in `env.json`.

### 6. Reinstall vs upgrade

| Mode | When | Data |
|------|------|------|
| Upgrade (default `dfx deploy`) | Compatible EOP layout ([DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md)) | Preserves admins, secrets, installers |
| Reinstall | IC0503 / incompatible layout and no migration | **Wipes** canister — re-claim Super Admin, re-enter Stripe/RESEND/PEM, re-upload installers |

**Lock:** Never reinstall without explicit operator approval and a post-reinstall checklist.

## Live canisters (dfx parallel store)

| Role | Canister ID |
|------|-------------|
| Backend | `5z2v5-uqaaa-aaaao-bbeaq-cai` |
| Frontend | `5xyyv-paaaa-aaaao-bbebq-cai` |
| Agentic URL | https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io |

Do **not** target Caffeine `nae7q-yaaaa-aaaai-atnvq-cai`.

## Post-reinstall / first-boot checklist

1. `/admin-claim` + claim code  
2. Stripe (test), RESEND, `private.pem`  
3. Chunked Mac/Windows installer upload ([DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md)) — allow several minutes  
4. Smoke trial email + download  
5. Confirm `canister_ids.json` + docs URL still match
