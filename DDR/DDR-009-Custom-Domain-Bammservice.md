# DDR-009: Custom domain `store.bammservice.com` → dfx frontend

**Date:** 2026-07-12  
**Status:** In progress — **Option A chosen** (`store.bammservice.com`); apex/`www` stay on Squarespace  
**Parent:** [DDR-008](DDR-008-Dfx-Primary-Caffeine-Backup.md)  
**Frontend canister:** `5xyyv-paaaa-aaaao-bbebq-cai`  
**Current URL:** https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io  
**Target (Option A):** https://store.bammservice.com  
**Docs:** [ICP custom domains](https://docs.internetcomputer.org/guides/frontends/custom-domains/)

## Context

Squarespace currently lists **`bammservice.com` as Primary / Connected** (Settings → Domains & Email → Domains), with **Use “www” prefix = On**. That means Squarespace continues to serve marketing on `www` / apex. The IC storefront uses a **subdomain** so DNS can be added without disconnecting Squarespace.

## Decision

**Option A selected (2026-07-12):** hostname **`store.bammservice.com`**.

| Option | Hostname | Squarespace | Status |
|--------|----------|-------------|--------|
| **A (chosen)** | `store.bammservice.com` | Keep marketing on Squarespace | **In progress** |
| B (deferred) | `www.bammservice.com` (+ apex) | Must stop Squarespace answering www/apex | Not selected |

Desktop canister IDs and II derivation origin must be updated **after** TLS for `store.bammservice.com` is **Available**.

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

```bash
curl -sL -X POST \
  -H 'Content-Type: application/json' \
  https://icp0.io/registrations \
  --data '{"name": "store.bammservice.com"}'

# Poll until state is Available
curl -sL "https://icp0.io/registrations/<REQUEST_ID>"
```

---

## Step 4 — II / env after domain is Available

1. Set `ii_derivation_origin` to `https://store.bammservice.com`.  
2. Redeploy frontend.  
3. Test Internet Identity on both `https://store.bammservice.com` and the `.icp0.io` URL. If II rejects an origin, add `.well-known/ii-alternative-origins` listing both hosts.  
4. Update Stripe return URLs / RESEND links if they hardcode `.icp0.io`.

---

## Step 5 — Acceptance checklist

- [ ] `curl https://store.bammservice.com/` returns the BAMM storefront (not Squarespace)  
- [ ] `curl https://store.bammservice.com/.well-known/ic-domains` lists `store.bammservice.com`  
- [ ] II login → Admin works on the custom host  
- [ ] Stripe test checkout return URL works on `store.bammservice.com`  
- [ ] Caffeine `bamm-gw3` left untouched (backup — DDR-008)

## Agent locks

- Do not change Squarespace `www`/apex or disconnect the primary domain (Option B only).  
- Do not point desktop production at `store.bammservice.com` until II + env cutover is verified.  
- Do not register the domain before `.well-known/ic-domains` is live on the canister.

## Consequence

Customers use https://store.bammservice.com for the IC store; marketing remains on Squarespace `bammservice.com` / `www`.
