# DDR-009: Custom domain `store.bammservice.com` → dfx frontend

**Date:** 2026-07-12  
**Status:** In progress — DNS + IC registration **done**; II/env cutover still pending  
**Parent:** [DDR-008](DDR-008-Dfx-Primary-Caffeine-Backup.md)  
**Frontend canister:** `5xyyv-paaaa-aaaao-bbebq-cai`  
**Current URL:** https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io  
**Custom domain (live):** https://store.bammservice.com  
**Docs:** [ICP custom domains](https://docs.internetcomputer.org/guides/frontends/custom-domains/)

## Context

Squarespace currently lists **`bammservice.com` as Primary / Connected** (Settings → Domains & Email → Domains), with **Use “www” prefix = On**. That means Squarespace continues to serve marketing on `www` / apex. The IC storefront uses a **subdomain** so DNS can be added without disconnecting Squarespace.

## Decision

**Option A selected (2026-07-12):** hostname **`store.bammservice.com`**.

| Option | Hostname | Squarespace | Status |
|--------|----------|-------------|--------|
| **A (chosen)** | `store.bammservice.com` | Keep marketing on Squarespace | **Registered** (HTTPS live 2026-07-13) |
| B (deferred) | `www.bammservice.com` (+ apex) | Must stop Squarespace answering www/apex | Not selected |

Desktop canister IDs for **entitlement activation** use the opaque frontend/backend canister path (BAMM DDR 2026-07-13); **II derivation origin** must still wait until TLS for `store.bammservice.com` is live (done 2026-07-13) and Step 4 is executed.

---

## Prerequisites

1. Dfx frontend healthy: https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io  
2. Operator can add DNS records under `bammservice.com` in Squarespace (Domains → DNS) without removing the primary connection.  
3. Repo serves `/.well-known/ic-domains` from the assets canister.  
4. After TLS is **Available**, update CI / `env.json`:

   - `ii_derivation_origin` → `https://store.bammservice.com`  
   - Redeploy frontend  
   - Add II alternative origins if login breaks (see § II)

---

## Step 1 — Add `.well-known/ic-domains` (code + deploy)

Files in repo (Vite `publicDir` → `src/frontend/dist`):

- `frontend/public/.well-known/ic-domains` → contents: `store.bammservice.com`
- `frontend/public/.ic-assets.json5` → ensure `.well-known` is **not** ignored

Redeploy frontend, then verify:

```bash
curl -sL "https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io/.well-known/ic-domains"
# expect: store.bammservice.com
```

---

## Step 2 — DNS records (Squarespace)

Canister ID = **`5xyyv-paaaa-aaaao-bbebq-cai`**.

In Squarespace → **Settings → Domains → bammservice.com → DNS Settings** (or “Advanced settings”), add:

| Type | Host | Value |
|------|------|--------|
| `CNAME` | `store` | `store.bammservice.com.icp1.io` |
| `TXT` | `_canister-id.store` | `5xyyv-paaaa-aaaao-bbebq-cai` |
| `CNAME` | `_acme-challenge.store` | `_acme-challenge.store.bammservice.com.icp2.io` |

Do **not** change `www` or apex records (Squarespace marketing stays).

### Verify DNS

```bash
dig +short CNAME store.bammservice.com
dig +short TXT _canister-id.store.bammservice.com
dig +short CNAME _acme-challenge.store.bammservice.com
```

Exactly **one** TXT on `_canister-id.store…`.

---

## Step 3 — Register with IC HTTP gateways

**Do not use** the deprecated `https://icp0.io/registrations` API (returns `canister_id_not_resolved`). Use the current registrar on `icp.net`:

```bash
# Optional preflight
curl -sL "https://icp.net/custom-domains/v1/store.bammservice.com/validate"

# Register
curl -sL -X POST "https://icp.net/custom-domains/v1/store.bammservice.com"

# Poll until registration_status is registered (TLS usually ready within a few minutes)
curl -sL "https://icp.net/custom-domains/v1/store.bammservice.com"
```

**Completed 2026-07-13:** validate → `valid`; register → accepted; status → `registered`; `https://store.bammservice.com/` → HTTP 200.

---

## Step 4 — II / env after domain is Available

**What this is:** storefront browser login + deployed `env.json` for the **web app**, not the desktop entitlement actor path.

| Concern | Step 4 (this) | Desktop entitlements |
|---------|---------------|----------------------|
| Who | Humans in browser on the store | Packaged BAMM backend |
| Identity | Internet Identity principals | RSA license + machine digest |
| Config | `ii_derivation_origin` in frontend `env.json` | `BAMM_COMMERCE_*` / canister defaults |
| Brand URL | Yes — `https://store.bammservice.com` | No — keep `*.icp0.io` + `icp-api.io` |

1. Set `ii_derivation_origin` to `https://store.bammservice.com` (CI inject in `dfx-deploy.yml` today writes `https://<frontend>.icp0.io`).  
2. Redeploy frontend so live `env.json` and asset canister pick up the new origin.  
3. Test Internet Identity on both `https://store.bammservice.com` and the `.icp0.io` URL. If II rejects an origin, add `.well-known/ii-alternative-origins` listing both hosts (same human can keep one principal across both URLs only if II alternative origins are configured correctly).  
4. Update Stripe return URLs / RESEND links if they hardcode `.icp0.io`.

**Risk if skipped:** Admin II login on the brand domain may create a **different principal** than on `.icp0.io`, so existing admin roles appear missing.  
**Risk if done too early (before TLS):** II / browsers reject the origin. TLS is already registered (2026-07-13).  
**Does not change:** desktop `activateEntitlement` routing (already pointed at dfx canisters for obscurity).

---

## Step 5 — Acceptance checklist

- [x] `curl https://store.bammservice.com/` returns the BAMM storefront (not Squarespace) — verified 2026-07-13  
- [x] `curl https://store.bammservice.com/.well-known/ic-domains` lists `store.bammservice.com` — verified 2026-07-13  
- [ ] II login → Admin works on the custom host  
- [ ] Stripe test checkout return URL works on `store.bammservice.com`  
- [x] Caffeine `bamm-gw3` left untouched (backup — DDR-008)

## Agent locks

- Do not change Squarespace `www`/apex or disconnect the primary domain (Option B only).  
- Do not point desktop production at `store.bammservice.com` until II + env cutover is verified.  
- Do not register the domain before `.well-known/ic-domains` is live on the canister.  
- Use `https://icp.net/custom-domains/v1/...` — not deprecated `icp0.io/registrations`.

## Consequence

Customers use https://store.bammservice.com for the IC store; marketing remains on Squarespace `bammservice.com` / `www`.
