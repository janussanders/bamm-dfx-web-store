# DDR-009: Custom domain `store.bammservice.com` → dfx frontend

**Date:** 2026-07-12  
**Status:** Implemented — Steps 1–4 live; II/Admin verified 2026-07-13; Stripe return URL still operator-check  
**Parent:** [DDR-008](DDR-008-Dfx-Primary-Caffeine-Backup.md)  
**Frontend canister:** `5xyyv-paaaa-aaaao-bbebq-cai`  
**Backend canister:** `5z2v5-uqaaa-aaaao-bbeaq-cai`  
**Custom domain (live):** https://store.bammservice.com  
**Docs:** [ICP custom domains](https://docs.internetcomputer.org/guides/frontends/custom-domains/)

## Context

Squarespace lists **`bammservice.com` as Primary / Connected**, with **Use “www” prefix = On**. Marketing stays on `www` / apex. The IC storefront uses subdomain **`store`** so DNS can be added without disconnecting Squarespace.

## Decision

**Option A selected (2026-07-12):** hostname **`store.bammservice.com`**.

| Option | Hostname | Squarespace | Status |
|--------|----------|-------------|--------|
| **A (chosen)** | `store.bammservice.com` | Keep marketing on Squarespace | **Live** (HTTPS + II derivation 2026-07-13) |
| B (deferred) | `www.bammservice.com` (+ apex) | Must stop Squarespace answering www/apex | Not selected |

Desktop entitlement activation uses opaque canister URLs (BAMM DDR 2026-07-13), not this brand host.

---

## Prerequisites

1. Dfx frontend healthy: https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io  
2. Operator can add DNS under `bammservice.com` without removing the primary connection.  
3. Repo serves `/.well-known/ic-domains` from the assets canister.  
4. After TLS is registered, set `ii_derivation_origin` + alternative origins (Step 4).

---

## Step 1 — Add `.well-known/ic-domains` (code + deploy)

**Done.** Files under `frontend/public/` (Vite `publicDir`):

- `.well-known/ic-domains` → `store.bammservice.com`
- `.ic-assets.json5` → `.well-known` not ignored

Verify: `curl -sL https://5xyyv-….icp0.io/.well-known/ic-domains`

---

## Step 2 — DNS records (Squarespace)

**Done 2026-07-13.** Canister ID = **`5xyyv-paaaa-aaaao-bbebq-cai`**.

| Type | Host | Value |
|------|------|--------|
| `CNAME` | `store` | `store.bammservice.com.icp1.io` |
| `TXT` | `_canister-id.store` | `5xyyv-paaaa-aaaao-bbebq-cai` |
| `CNAME` | `_acme-challenge.store` | `_acme-challenge.store.bammservice.com.icp2.io` |

Do **not** change `www` or apex (Squarespace marketing stays). Domain Lock (transfer lock) does not block DNS edits.

---

## Step 3 — Register with IC HTTP gateways

**Done 2026-07-13.** Use `icp.net` (not deprecated `icp0.io/registrations`):

```bash
curl -sL "https://icp.net/custom-domains/v1/store.bammservice.com/validate"
curl -sL -X POST "https://icp.net/custom-domains/v1/store.bammservice.com"
curl -sL "https://icp.net/custom-domains/v1/store.bammservice.com"
```

Result: `registration_status: registered`; `https://store.bammservice.com/` → HTTP 200.

---

## Step 4 — II / env cutover

**What this is:** storefront browser login + deployed `env.json` for the **web app**, not the desktop entitlement actor path.

| Concern | Step 4 | Desktop entitlements |
|---------|--------|----------------------|
| Who | Humans in browser on the store | Packaged BAMM backend |
| Identity | Internet Identity principals | RSA license + machine digest |
| Config | `ii_derivation_origin` in frontend `env.json` | `BAMM_COMMERCE_*` / canister defaults |
| Brand URL | Yes — `https://store.bammservice.com` | No — keep `*.icp0.io` + `icp-api.io` |

### Implementation (2026-07-13)

1. CI (`dfx-deploy.yml`) writes `ii_derivation_origin` = `https://store.bammservice.com`.  
2. `frontend/public/.well-known/ii-alternative-origins` lists `https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io` so both hosts share principals (brand = primary).  
3. `.ic-assets.json5` serves alternative-origins as JSON with CORS.  
4. Social login passes the same `derivationOrigin` from `env.json`.  
5. Admin invite / elevation RESEND bodies updated in source to `https://store.bammservice.com/admin/accept-invite` (**backend wasm not yet upgraded** — full deploy hit IC0503; frontend-only deploy used for Step 4 assets).  
6. Stripe success/cancel URLs already use `window.location` (brand host when browsing there).  
7. Legal Terms copy references `store.bammservice.com`.

**Operator note:** Admins who previously authenticated only under the old `.icp0.io` derivation origin may see a new principal after this cutover. Use `/admin-claim` with the super-admin claim code if Admin access is missing.

**Does not change:** desktop `activateEntitlement` routing (canister obscurity).

**Follow-up:** Redeploy backend when IC0503 is resolved (DDR-006 append-only / toolchain align) so invite emails use the brand URL.
---

## Step 5 — Acceptance checklist

- [x] `curl https://store.bammservice.com/` returns the BAMM storefront (not Squarespace) — verified 2026-07-13  
- [x] `curl https://store.bammservice.com/.well-known/ic-domains` lists `store.bammservice.com` — verified 2026-07-13  
- [x] II login → Admin works on `https://store.bammservice.com` (operator verified 2026-07-13)  
- [ ] Stripe test checkout return URL works on `store.bammservice.com` (operator)  
- [x] Caffeine `bamm-gw3` left untouched (backup — DDR-008)  
- [x] Live `env.json` has `ii_derivation_origin` = `https://store.bammservice.com` (after deploy)  
- [x] `/.well-known/ii-alternative-origins` lists the frontend canister URL (after deploy)

## Agent locks

- Do not change Squarespace `www`/apex or disconnect the primary domain (Option B only).  
- Desktop activation keeps opaque canister URLs (not brand domain).  
- Do not register the domain before `.well-known/ic-domains` is live on the canister.  
- Use `https://icp.net/custom-domains/v1/...` — not deprecated `icp0.io/registrations`.

## Consequence

Customers use https://store.bammservice.com for the IC store; marketing remains on Squarespace `bammservice.com` / `www`.
