# Dfx CI identity — secret setup & funding

**Script:** [`scripts/setup-dfx-ci-secret.sh`](../scripts/setup-dfx-ci-secret.sh)  
**Related:** [dfx-deploy.md](dfx-deploy.md), [DDR-004](../DDR/DDR-004-Dfx-CI-Deploy-Agentic-URL.md)

## Where the PEM lives (safe, build-safe)

| Location | Purpose |
|----------|---------|
| `.secrets/dfx-ci-identity.pem` | Local copy for re-upload; **gitignored** |
| `~/.config/dfx/identity/bamm-dfx-ci/` | dfx identity home |
| GitHub Actions secret `DFX_IDENTITY_PEM` | Used only when workflow `deploy=true` |

`.secrets/` is ignored by git and is **not** read by mops, pnpm, or `dfx build`. The setup script is operator-only — never wired into CI build steps.

## One-shot: create identity + upload secret

```bash
cd /Users/janussanders/bamm-dfx-web-store
chmod +x scripts/setup-dfx-ci-secret.sh
./scripts/setup-dfx-ci-secret.sh
```

Creates `bamm-dfx-ci` with **keyring** storage (not plaintext — avoids the insecure `identity.json` warning). Exports PEM only into gitignored `.secrets/` for GitHub upload.

Requires: `dfx`, `gh` (authenticated: `gh auth login`).

If keyring is unavailable:

```bash
DFX_CI_STORAGE_MODE=password-protected ./scripts/setup-dfx-ci-secret.sh
```

Re-upload only:

```bash
./scripts/setup-dfx-ci-secret.sh --upload-only
```

Print principal:

```bash
./scripts/setup-dfx-ci-secret.sh --print-principal
```

## Fund the CI identity (cycles)

GitHub Actions deploys as principal `bamm-dfx-ci`. That principal needs **cycles** on the Internet Computer to create/install canisters.

### Option A — Convert ICP you already hold (recommended)

1. Use an identity that has ICP on the **IC mainnet ledger**:

```bash
dfx identity use default   # or whatever holds ICP
dfx ledger balance --network ic
```

2. Send a small amount of ICP to the **CI principal** (from `--print-principal`), **or** convert from the funded identity and then transfer cycles — simplest path for many operators:

```bash
# See CI principal
./scripts/setup-dfx-ci-secret.sh --print-principal

# From an identity with ICP, convert ICP → cycles into the current identity's cycles account
dfx identity use default
dfx cycles convert --amount 0.5 --network ic

# Check cycles balance
dfx cycles balance --network ic
```

3. If convert credited `default` but CI is `bamm-dfx-ci`, transfer cycles to the CI principal (dfx cycles transfer — check `dfx cycles transfer --help` for your dfx version), **or** fund by converting while using the CI identity if that identity can receive ICP first:

```bash
dfx identity use bamm-dfx-ci
# Send ICP to this principal via NNS / exchange / dfx ledger transfer, then:
dfx cycles convert --amount 0.5 --network ic
dfx cycles balance --network ic
```

**Rough guide:** 0.5–1.0 ICP converted is usually enough to create backend + frontend and iterate a few deploys. Top up as needed.

### Option B — NNS / ICP dashboard

1. Get principal: `./scripts/setup-dfx-ci-secret.sh --print-principal`
2. In [NNS dapp](https://nns.ic0.app/) (or your wallet), send ICP to that principal
3. Locally: `dfx identity use bamm-dfx-ci && dfx cycles convert --amount <ICP> --network ic`

### Option C — Developer faucet (limited / may not suit production CI)

DFINITY sometimes offers a cycles faucet for developers. Prefer Option A for a durable CI identity.

## After funding

1. Confirm: `dfx identity use bamm-dfx-ci && dfx cycles balance --network ic`
2. GitHub → Actions → **Deploy dfx (IC)** → `deploy=true`
3. Copy **Agentic URL** from the job summary

## Security

- Never commit `.secrets/` or PEMs
- Prefer a dedicated `bamm-dfx-ci` identity (not your personal day-to-day identity)
- Rotate: create new identity → re-run setup script → remove old GitHub secret value by overwriting
