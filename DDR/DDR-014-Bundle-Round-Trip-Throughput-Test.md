# DDR-014: Manual Bundle Round-Trip Throughput Test ($1.35)

**Date:** 2026-07-06  
**Status:** Approved (manual QA procedure)  
**Type:** Commerce / Licensing / QA  
**Companion:** `DDR/DDR-013-Admin-Bundle-Management.md`, `DDR/DDR-004-Payment-Workflow.md`

## Purpose

Run a **full purchase → email license → BAMM desktop import** round-trip for **each** annual bundle SKU at a controlled Stripe charge of **$1.35**, then restore production pricing before moving to the next bundle.

This validates:

1. Bundle checkout (Stripe line item = bundle display name)
2. Fulfillment (`expandLineItemToBammFeatures` → RSA license payload)
3. Email delivery (RESEND)
4. Admin logs (transaction log, premium purchase, submission)
5. BAMM desktop license verification and bundle inference

## What to change (and what not to)

| Change | Required for $1.35 test? | Affects checkout total? | Affects license features? |
|--------|--------------------------|-------------------------|---------------------------|
| **Bundle → Annual price** | **Yes** — set to `$1.35` | **Yes** | No |
| Feature → Price (Features Management) | **No** | Only à la carte builder | No |
| Bundle → Included features | **No** | No | **Yes** — do not edit |
| Bundle → Display name | **No** | Stripe line item label only | Yes if renamed (fulfillment matches name/ID) |
| Marketing copy (headline, badge, bullets) | **No** | No | No |

**Rule:** For throughput testing, edit **only** the target bundle’s **Annual price ($)** field in **Bundle Management**. Leave all other bundles at production prices (or temporarily disable them — see below).

Stripe minimum on `/premium` is **$0.50**; **$1.35** is valid.

---

## Production price reference (restore after each bundle test)

### Bundle annual prices

Set **Annual price ($)** in Admin → Features Management → **Bundle Management → Edit**.

| Sort | Bundle ID | Display name | Production price | Admin field value |
|-----:|-----------|--------------|-----------------:|------------------:|
| 1 | `complete_annual` | BAMM Complete | $349.99/yr | **349.99** |
| 2 | `planner_tax_annual` | Planner + Tax | $169.99/yr | **169.99** |
| 3 | `pro_annual` | Pro Bundle | $329.99/yr | **329.99** |
| 4 | `planner_annual` | Planner Bundle | $34.99/yr | **34.99** |

**Test price (all bundles):** **1.35** (= 135 cents)

### Premium feature à la carte prices (do not change for this test)

Contracts SSOT (`packages/bamm-contracts/data/features.json`). Restore only if you accidentally edited feature prices.

| Feature ID (canister) | License name (RSA payload) | Production annual price |
|-----------------------|----------------------------|------------------------:|
| `paycheck_budget` | Paycheck Budget | $9.99 |
| `goals` | Goals | $29.99 |
| `tx_simulator` | Tx Simulator | $149.99 |
| `migration-management` | Database Management | $49.99 |
| `trades` | Trades | $199.99 |

> **Note:** If you used **Initialize Default Premium Features** long ago, canister seed prices may differ from contracts (e.g. Paycheck $19.99, Goals $14.99). That does **not** affect bundle checkout total — only the “Save $X vs à la carte” display. For production alignment, match contracts when you next edit features.

---

## Prerequisites

- [ ] Caffeine deploy includes DDR-013 bundle admin (`main` after PR #14).
- [ ] Admin → **Initialize Default Premium Features** (if empty).
- [ ] Admin → **Initialize Default Bundles** (if empty).
- [ ] Stripe configured (live or test mode — use the mode you intend to charge).
- [ ] Private signing key uploaded on canister.
- [ ] RESEND configured for license email.
- [ ] BAMM desktop app running locally (`http://localhost:3000` per `AGENTS.md`).
- [ ] Email inbox you control for license delivery.

---

## Recommended test order

Test **one bundle at a time**, smallest → largest (fewer features = faster BAMM spot-check):

1. `planner_annual` — Planner Bundle  
2. `planner_tax_annual` — Planner + Tax  
3. `pro_annual` — Pro Bundle  
4. `complete_annual` — BAMM Complete  

---

## Per-bundle procedure

Repeat for **each** row in the table below.

### A. Set test price (admin)

1. Open **Admin Panel → Features Management** (scroll to **Bundle Management**).
2. Click **Edit** on the target bundle only.
3. Set **Annual price ($)** to **`1.35`**.
4. Leave **Included features**, **Display name**, and all marketing fields unchanged.
5. Click **Update Bundle**.
6. *(Optional)* Toggle **Active** off on the other three bundles to prevent mis-clicks. Re-enable after this bundle’s test.

### B. Purchase (storefront)

1. Open **`/premium`** (hard refresh).
2. Select **only** the target bundle card.
3. Confirm order summary shows **$1.35** (not à la carte).
4. Complete Stripe checkout.
5. Land on **`/payment-success`** — wait for fulfillment (license email).

### C. Verify commerce side

| Check | Where | Pass criteria |
|-------|--------|---------------|
| Amount | Stripe dashboard / receipt | $1.35 USD |
| Transaction log | Admin → Email / transaction logs | Features list matches bundle (see table below) |
| Premium purchase | Admin → Purchases | Same feature names, correct email |
| Email | Inbox | `license.json` (or attached license) received |

### D. Verify BAMM desktop

1. In BAMM → **Manage** → import the license file from email.
2. Confirm license verifies (no signature error).
3. Confirm **bundle label** and **enabled premium modules** match the table below.
4. Open one licensed route (e.g. Goals) — module loads without “premium required”.

> BAMM infers bundle name from **licensed feature names**, not from what you paid. The UI still shows production bundle names/prices from `scripts/available-features.json` (e.g. “Planner Bundle”, $34.99/yr) even when you paid $1.35.

### E. Restore production price

1. Admin → Bundle Management → **Edit** same bundle.
2. Set **Annual price ($)** back to the **Production price** in the reference table.
3. **Update Bundle**.
4. Re-enable any bundles you disabled in step A6.
5. Proceed to the **next** bundle.

---

## Per-bundle expected license features (RSA / BAMM)

These are the canonical `licenseReferenceName` values that must appear in the signed license and transaction logs.

| Bundle ID | Display name | Expected features in license | BAMM bundle label (Manage) | Spot-check routes |
|-----------|--------------|------------------------------|----------------------------|-------------------|
| `planner_annual` | Planner Bundle | Paycheck Budget, Goals | Planner Bundle | `/paycheck-budget`, `/goals` |
| `planner_tax_annual` | Planner + Tax | Paycheck Budget, Goals, Tx Simulator | Planner + Tax | above + `/tx-sim` |
| `pro_annual` | Pro Bundle | Paycheck Budget, Goals, Tx Simulator, Trades | Pro Bundle | above + `/trades` |
| `complete_annual` | BAMM Complete | Paycheck Budget, Goals, Tx Simulator, **Database Management**, Trades | BAMM Complete | above + Database Management tools |

**Regulated modules:** `planner_tax_annual`, `pro_annual`, and `complete_annual` include Tx Simulator and/or Trades — complete any required disclaimers on `/premium` before checkout.

---

## Throughput checklist (copy per run)

```
Bundle: ____________________  Date: __________  Email: ____________________

[ ] Test price set to $1.35 (other bundles disabled optional)
[ ] /premium shows $1.35 for selected bundle
[ ] Stripe payment succeeded
[ ] /payment-success completed
[ ] Transaction log features: _______________________________________________
[ ] License email received
[ ] BAMM import OK — bundle label: _________________________________________
[ ] Licensed routes open: __________________________________________________
[ ] Production price restored: $__________
[ ] Other bundles re-enabled
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Checkout still shows full price | Stale `/premium` or wrong bundle | Hard refresh; confirm only one bundle edited |
| Payment OK, no email | RESEND / fulfillment error | Admin transaction log pipeline steps; retry from `/payment-success` with same `session_id` (idempotent) |
| License has wrong features | Bundle `featureIds` edited or name mismatch | Restore includes; ensure display name matches seeded name or `bundleId` |
| BAMM shows “Custom annual license” | Feature set doesn’t match any registry bundle | Compare license `features[]` to table above; check Database Management vs Migration naming |
| Complete missing Database Management | `migration-management` not in bundle includes | Edit bundle includes — must list Database Management feature id on canister |

---

## After all four bundles

1. Confirm all four bundles show **production** annual prices on `/premium`.
2. Spot-check Admin → Bundle Management table matches the production reference table.
3. No feature prices were changed (or restore from contracts table if needed).

**Total test spend (if all four run):** 4 × $1.35 = **$5.40** (+ Stripe fees).
