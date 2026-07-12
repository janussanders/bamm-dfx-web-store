# DDR-009: Custom domain `bammservice.com` → dfx frontend

**Date:** 2026-07-12  
**Status:** Approved (design + operator runbook) — **not yet executed**  
**Parent:** [DDR-008](DDR-008-Dfx-Primary-Caffeine-Backup.md)  
**Frontend canister:** `5xyyv-paaaa-aaaao-bbebq-cai`  
**Current URL:** https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io  
**Target:** https://www.bammservice.com (and optionally apex `bammservice.com`)  
**Docs:** [ICP custom domains](https://docs.internetcomputer.org/guides/frontends/custom-domains/)

## Context

Squarespace currently lists **`bammservice.com` as Primary / Connected** (Settings → Domains & Email → Domains), with **Use “www” prefix = On**. That means Squarespace is serving the marketing site today. Pointing the same hostname at the IC frontend **replaces** Squarespace hosting for that hostname unless you use a **subdomain** instead.

## Decision (recommended path)

| Option | Hostname | Squarespace | Effort / risk |
|--------|----------|-------------|----------------|
| **A (recommended first)** | `store.bammservice.com` (or `shop.` / `app.`) | Keep marketing on Squarespace | Low — add DNS only; no Squarespace disconnect |
| **B (full brand URL)** | `www.bammservice.com` (+ apex) | Must **stop** Squarespace from answering www/apex | Higher — DNS cutover + downtime window |

**Approve A or B before changing DNS.** This DDR documents both. Desktop canister IDs and II derivation origin must be updated after the chosen hostname is live.

---

## Prerequisites (both options)

1. Dfx frontend healthy: https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io  
2. Operator can edit DNS for `bammservice.com` (Squarespace Domains UI **or** external DNS if you move nameservers).  
3. Repo change: serve IC domain ownership file from the **assets** canister (next section).  
4. After TLS is **Available**, update `src/frontend/env.json` inject / CI deploy:

   - `ii_derivation_origin` → `https://www.bammservice.com` (or the Option A host)  
   - Redeploy frontend  
   - Configure Internet Identity **alternative origins** if II login breaks on the new host (see § II)

---

## Step 1 — Add `.well-known/ic-domains` (code + deploy)

In `bamm-dfx-web-store`, add a file the asset canister serves at:

```text
/.well-known/ic-domains
```

Contents (one domain per line; include every hostname you will register):

```text
www.bammservice.com
bammservice.com
```

For Option A only:

```text
store.bammservice.com
```

Ensure assets config does **not** ignore `.well-known` (`.ic-assets.json5`: `ignore` must not hide it; `/.well-known` must be served). Redeploy frontend, then verify:

```bash
curl -sL "https://5xyyv-paaaa-aaaao-bbebq-cai.icp0.io/.well-known/ic-domains"
```

---

## Step 2 — DNS records

Replace `CUSTOM_DOMAIN` with your chosen host (`www.bammservice.com` or `store.bammservice.com`).  
Canister ID = **`5xyyv-paaaa-aaaao-bbebq-cai`**.

### Subdomain (Option A — e.g. `store.bammservice.com`)

| Type | Host | Value |
|------|------|--------|
| `CNAME` | `store` | `store.bammservice.com.icp1.io` |
| `TXT` | `_canister-id.store` | `5xyyv-paaaa-aaaao-bbebq-cai` |
| `CNAME` | `_acme-challenge.store` | `_acme-challenge.store.bammservice.com.icp2.io` |

In Squarespace DNS UI, host fields are often without the zone suffix (e.g. host `store`, `_canister-id.store`, `_acme-challenge.store`).

### `www` (Option B)

| Type | Host | Value |
|------|------|--------|
| `CNAME` | `www` | `www.bammservice.com.icp1.io` |
| `TXT` | `_canister-id.www` | `5xyyv-paaaa-aaaao-bbebq-cai` |
| `CNAME` | `_acme-challenge.www` | `_acme-challenge.www.bammservice.com.icp2.io` |

### Apex `bammservice.com` (Option B, optional)

Apex usually **cannot** use a plain CNAME. Prefer provider **ALIAS / ANAME** (CNAME flattening) to:

```text
bammservice.com.icp1.io
```

Plus:

| Type | Host | Value |
|------|------|--------|
| `TXT` | `_canister-id` | `5xyyv-paaaa-aaaao-bbebq-cai` |
| `CNAME` | `_acme-challenge` | `_acme-challenge.bammservice.com.icp2.io` |

**Squarespace conflict:** While the domain is “Connected” as the Squarespace site primary, Squarespace may own www/apex records. For Option B you typically must:

1. Back up any Squarespace-only pages you still need.  
2. In Squarespace → Domains → `bammservice.com`, either disconnect the domain from the Squarespace site or move DNS to a registrar that lets you set the IC records without Squarespace overwriting them.  
3. Remove Squarespace-parked A/AAAA records that point at Squarespace IPs (those break IC gateways).

Do **not** invent A/AAAA IPs for IC — use CNAME/ALIAS to `*.icp1.io` only.

### Verify DNS

```bash
dig +short CNAME store.bammservice.com          # or www
dig +short TXT _canister-id.store.bammservice.com
dig +short CNAME _acme-challenge.store.bammservice.com
```

Exactly **one** TXT on `_canister-id…`.

---

## Step 3 — Register with IC HTTP gateways

```bash
# Register (returns a request id)
curl -sL -X POST \
  -H 'Content-Type: application/json' \
  https://icp0.io/registrations \
  --data '{"name": "store.bammservice.com"}'

# Poll until state is Available
curl -sL "https://icp0.io/registrations/<REQUEST_ID>"
```

Repeat for each hostname (`www.bammservice.com`, apex if used).

---

## Step 4 — II / env after domain is Available

1. CI / local deploy: set `ii_derivation_origin` to `https://<CUSTOM_DOMAIN>`.  
2. Redeploy frontend so `dist/env.json` matches.  
3. Test Internet Identity login on the custom domain. If II rejects the origin, add IC **alternative origins** for the frontend canister (DFINITY II docs) listing both `https://5xyyv-….icp0.io` and `https://www.bammservice.com`.  
4. Update any bookmarks, Stripe return URLs, and RESEND links if they hardcode `.icp0.io`.

---

## Step 5 — Acceptance checklist

- [ ] `curl https://<CUSTOM_DOMAIN>/` returns the BAMM storefront (not Squarespace)  
- [ ] `curl https://<CUSTOM_DOMAIN>/.well-known/ic-domains` lists the domain  
- [ ] II login → Admin works  
- [ ] Stripe test checkout return URL works on the custom host  
- [ ] RESEND links / emails (if any) use the custom host where appropriate  
- [ ] Caffeine `bamm-gw3` left untouched (backup — DDR-008)

## Agent locks

- Do not change Squarespace DNS or disconnect the primary domain without operator confirmation of Option A vs B.  
- Do not point desktop production at the custom domain until II + env cutover is verified.  
- Do not register a domain whose `.well-known/ic-domains` file was never deployed.

## Consequence

Customers use a branded URL; IC canister IDs remain the source of truth. Squarespace can remain a marketing CMS on a different host or be retired after Option B.
