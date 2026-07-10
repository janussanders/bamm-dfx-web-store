# BAMM E-Commerce Site

Storefront and license fulfillment for **BAMM** (Budget. Analyze. Manage. Master.) — hosted on [Caffeine.ai](https://caffeine.ai) with an Internet Computer (IC) Motoko backend canister.

**Production:** https://bamm-gw3.caffeine.xyz/

## What this repo does

- Public marketing site, free trial download, and premium checkout
- **Stripe** payment processing (live checkout, no login required)
- **RSA license signing** on the canister (trial, paid, and admin-generated licenses)
- **RESEND** email delivery for licenses and admin invites
- **Admin panel** with RBAC (Super Admin, Administrator, Features Manager, License Generator)
- **Internet Identity** with Google, Apple, and Microsoft sign-in

Related desktop app: [janussanders/BAMM](https://github.com/janussanders/BAMM)

## Architecture

| Layer | Stack |
|-------|--------|
| Backend | Motoko canister (`src/backend/`) — stable storage, signing, Stripe/RESEND integration |
| Frontend | React + Vite (`src/frontend/`) — served as IC asset canister |
| Hosting | Caffeine.ai — GitHub import → build → IC mainnet deploy |
| Secrets | Stripe, RESEND, RSA private PEM — uploaded via Admin, persisted in canister stable storage |

Licenses are signed **server-side** in the canister (`LicenseSigner.mo`). The private key is never exposed via query endpoints. See [DDR/DDR-005-P0-Server-Side-License-Signing.md](DDR/DDR-005-P0-Server-Side-License-Signing.md).

## Repository layout

```
src/backend/          Motoko canister source + dist (bindgen)
src/frontend/         React app source
frontend/public/      Static assets (icons, favicon) — single public dir for Vite
DDR/                  Design Decision Records
contracts/            Feature snapshot for @bamm/contracts alignment
scripts/              Verification utilities
```

**Not in git (by design):** Mac/Windows installers, RSA private key, Stripe/RESEND API keys — configured in Admin after deploy.

## Deploy via Caffeine

### Git workflow

**Push to `main`, tag, then import in Caffeine UI (agents cannot import).** Full agentic contract: [DDR-027](DDR/DDR-027-Caffeine-Agentic-Workspace-Workflow.md).

```
edit → push main → tag → [operator] GitHub import → [if IC0503] redeploy_draft → [agent] build only → [operator] promote
```

| Step | Who | Action |
|------|-----|--------|
| 1 | Developer | Push commits to **`main`**; run `pnpm release:caffeine -- v133.0.x --publish` (or manual tag) |
| 2 | **Operator** | Caffeine → **GitHub Settings** → Import (tag preferred; blank OK if `main` == tag tip) |
| 3 | **Operator** | Wait ~60s |
| 4 | **Operator confirms** | If draft hit IC0503: **`redeploy_draft`** for **`ucnbj-nqaaa-aaaab-aajua-cai`** (draft only; not production) — paste from release helper |
| 5 | **Draft agent** | **Build only** — paste from release helper |
| 6 | **Operator** | Promote / production upload if needed (DDR-009) |

**Current release:** **`v133.0.14`**

Release helper: `scripts/caffeine-release.mjs` / `pnpm release:caffeine -- <tag>` — automates preflight + notes + optional tag/publish; **does not** click Caffeine import/`redeploy_draft`/promote.
### Draft agent (build only)

```
Build only from the current workspace. Run backend and frontend builds per caffeine.toml.
Deploy to draft only.
Do not import from GitHub.
Do not edit caffeine.toml, mops.toml, migration, or actor shape.
Do not reinstall production.
If IC0503 occurs, stop and request redeploy_draft for ucnbj-nqaaa-aaaab-aajua-cai.
```

The draft agent **cannot** import GitHub or promote to production. Checklist: [DDR-018](DDR/DDR-018-Caffeine-Import-Runbook.md) / [DDR-027](DDR/DDR-027-Caffeine-Agentic-Workspace-Workflow.md).

### Draft vs production (critical)

Caffeine often reports “Version N deployed to production” while **only the draft canister has new assets**. This has blocked live updates repeatedly.

| URL | Role |
|-----|------|
| https://bamm-gw3.caffeine.xyz/ | **Production** — public site; must match draft after promote |
| `https://*-draft.caffeine.xyz/` | **Draft preview** — new builds land here first |

**Symptoms:** Draft shows hero badge / Trades tile / legal footer; production does not. Agent says production is current — **trust the URLs, not the status message**.

**Fix:** After a green build, the composer must **forced clean rebuild**, **explicit asset upload to production**, and **promote draft to production** on `bamm-gw3`. Do not stop at “build complete” or draft preview alone.

**Verification checklist (production URL):**

| Check | Expected |
|-------|----------|
| Hero badge | **Local-first desktop app** |
| Features That Matter | **7 tiles** (incl. Trades) |
| Footer | Terms · Privacy · Refunds |
| `/terms` §9 | **Washington State** governing law (not Delaware template) |
| Draft vs production | Both URLs match after promote |

### Stale deploy cache (`dist/` + `.old/`)

If workspace **source** is correct but **production still serves v116 assets**, the failure is **stale `src/frontend/dist/`** (never rebuilt) and/or draft-only upload — not GitHub. Stale dist often has **identical hashed filenames** to `.old/` and **missing** legal page bundles.

**Remediation:** delete `dist/` + `.old/` (platform team if agent blocked), force frontend rebuild, explicit production asset upload, `commit_and_deploy_draft`. Full write-up: [DDR-009](DDR/DDR-009-Caffeine-Stale-Deploy-Cache.md).

### Motoko dependencies

Backend build runs `mops install` before `mops build` (see `src/backend/caffeine.toml`). The `.mops/` cache is not committed — Caffeine must install deps on each import. Use **`mo:core/List`** or **`mo:core/VarArray`**, not `mo:core/Buffer` (removed in core 2.5.0).

If you change `[dependencies]` in `mops.toml`, regenerate and commit `mops.lock`: `npx -y ic-mops@latest install` (see `DDR/DDR-010-Mops-Lock-Deps-Hash-Mismatch.md`). Before every push: `pnpm validate:mops-lock`.

### First-time / slim import

1. Caffeine project → **Import from GitHub**
2. Repository: `janussanders/bamm-e-commerce-site`
3. Git ref: **`main`** (or `caffeine-import-slim` only for the initial slim path — see [SLIM_IMPORT.md](SLIM_IMPORT.md))
4. Publish when the import/build completes

The repo is kept under ~10 MB tracked so Caffeine GitHub import succeeds. Do not re-add `src/frontend/dist/`, duplicate `public/` trees, or dev screenshots — see [SLIM_IMPORT.md](SLIM_IMPORT.md).

## Post-deploy checklist

1. **Super Admin** — claim or verify admin access
2. **Stripe** — live secret key + webhook configuration
3. **RESEND** — API key for outbound email
4. **RSA private key** — Admin → `uploadPrivateKeyPem` (must match `public.pem` shipped in BAMM desktop builds)
5. **Installers** — upload Mac `.dmg` and Windows `.exe` via Admin if download links are empty
6. **Smoke test** — free trial email, paid checkout, manual license generation

After any key rotation, upload the new PEM on the canister and release a BAMM desktop build with the matching `public.pem`.

## Security highlights

- **SEC-001 remediated:** No public private-key export; all license signing on-canister
- **RBAC:** Role guards on every admin endpoint
- **Rate limits:** `submitUser` per-email cooldown + hourly cap
- **PII:** Transaction logs admin-only
- **Audit trail:** Admin actions logged

Full security and payment decisions: [DDR/](DDR/README.md)

## Local development

This project is built and deployed through Caffeine. Local iteration typically happens in the Caffeine editor or by pushing to GitHub and re-importing.

```bash
pnpm install
pnpm run build      # workspace build
pnpm run bindgen    # regenerate frontend actor bindings after backend DID changes
```

Requires Node ≥16, pnpm ≥7, and Caffeine toolchain for IC deployment.

## Design records

Significant decisions are documented under [DDR/](DDR/README.md):

- Admin RBAC, RSA licensing, key persistence, Stripe workflow, email logs, Internet Identity SSO, P0 server-side signing

## License

Proprietary — BAMM SERVICES INC. (see Terms and desktop installer EULA).
