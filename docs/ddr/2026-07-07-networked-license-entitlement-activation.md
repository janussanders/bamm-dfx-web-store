# DDR: Networked License Entitlement & Activation (E-Commerce Companion)

**Date:** 2026-07-07  
**Status:** In progress (Phase 1 canister core landed 2026-07-07)  
**Type:** Licensing / IC Canister / Admin  
**Authoritative spec:** [BAMM enterprise DDR](https://github.com/janussanders/BAMM/blob/main/docs/ddr/enterprise/2026-07-07-networked-license-entitlement-activation.md)

---

## Scope (this repo)

Implementation owner for **entitlement SSOT**, **activation API**, **purchase merge**, and **super-admin-only Generate License**.

## Current gaps (investigation)

| Capability | Status |
|------------|--------|
| `generateLicense` | Implemented; role guard is `#licenseGenerator` (too permissive) |
| Paid fulfillment | 365d from issue, no deferred term |
| Multi-purchase merge | Not implemented (explicitly deferred in tiered bundle rollout) |
| Machine binding | Not in payload |
| Desktop activation API | None |
| Entitlement registry | `getEntitlementRegistry()` + admin Entitlements tab; purchase cross-ref via `entitlementId` |

## Required canister changes

Policy constants: `@bamm/contracts/data/licensing-policy.json` (Phase 0 complete in BAMM repo).

### Data model

Add stable storage:

- `customerEntitlements : HashMap<Text, CustomerEntitlement>` — key = normalized email
- `activationRecords : HashMap<Text, ActivationRecord>` — key = entitlement_id

`CustomerEntitlement` fields mirror BAMM DDR: `entitlement_id`, `email`, `feature_ids[]`, `purchased_at`, `activation_deadline`, `activated_at?`, `expires_at?`, `machine_binding_digest?`, `status`.

### API

| Function | Min role | Notes |
|----------|----------|-------|
| `activateEntitlement` | Public (nonce-gated) | Issues v2 signed license |
| `getEntitlementStatus` | Public (email hash or id) | Desktop polling |
| `getCustomerEntitlements` | `#administrator` | Support |
| `generateLicense` | **`#licenseGenerator`** (administrator and above) | Restored after superAdmin-only regression |
| `sendManualLicense` | **`#licenseGenerator`** | Same |

### Fulfillment changes

- `fulfillPaidLicense` / `generateAndSendPaidLicense`: union features into `customerEntitlements`; set `expires` only after activation.
- Email template: include activation nonce + link to Manage activation instructions.

### Frontend

- `AdminPanel.tsx`: `canSeeLicensesTab` → administrator, featuresManager, licenseGenerator, and superAdmin.
- `LicenseGenerationPanel.tsx`: hide for non–super-admins.
- **Entitlements registry (2026-07-07):** Admin → Purchases → Entitlements sub-tab lists `getEntitlementRegistry()` rows with status/feature chips, expandable workflow timeline, and linked premium purchases (email, transaction ID, Stripe session, amount, dates). Purchases table shows `entitlementId` when linked.

### Entitlement registry data model (admin)

| Field | Source | Purpose |
|-------|--------|---------|
| `entitlementId` | `CustomerEntitlement` | Primary key; written to `PremiumPurchase.entitlementId` on fulfillment |
| `workflowSteps` | `entitlementWorkflowLogs` map | Append-only audit trail (max 50 steps); mirrored to `auditLog` as `entitlement_workflow` |
| `linkedPurchases` | `premiumPurchases` filtered by email + `entitlementId` | Cross-reference Stripe txn, session, payment status |
| Workflow steps | `entitlement_created`, `purchase_fulfilled`, `license_emailed`, `entitlement_activated`, merge/reopen variants | Human-readable chips in admin UI |

Public API: `getEntitlementRegistry()` — administrator role, query.

### Stable upgrade migration (2026-07-07)

Adding `PremiumPurchase.entitlementId` breaks orthogonal persistence upgrade (M0170) against production canisters that stored purchases without that field.

**Fix:** `src/backend/EntitlementMigration.mo` + `(with migration = EntitlementMigration.migration) actor BAMM` in `main.mo`. On upgrade, existing purchases receive `entitlementId = ""`; new fulfillment paths set the real entitlement id.

**Admin backfill (2026-07-08):** Empty Entitlements tab after upgrade is expected until `backfillEntitlementsFromPurchases` runs (or a new Stripe fulfillment). See [DDR-028](../DDR/DDR-028-Entitlement-Registry-Backfill.md).

**M0170 on Caffeine import (stale `.old/`):** Pin check-stable to `scripts/check-stable/backend-02c10d9.most` — see [DDR-016](../DDR/DDR-016-PremiumPurchase-M0170-Check-Stable-Baseline.md), [DDR-017](../DDR/DDR-017-IC0503-Memory-Incompatible-Upgrade.md).

Fresh installs skip migration. Re-import tag **`v133.0.2` or later** (Caffeine Version 133; see DDR-015).

## Implementation phases

See authoritative BAMM DDR **Implementation plan** — Phase 0 (contracts) + Phase 1 (this repo).

## Companion PR checklist

- [ ] Candid updated + `pnpm bindgen`
- [ ] `contracts/canister-*.snapshot.json` if feature list changes
- [ ] `ALIGNMENT.md` updated
- [ ] BAMM PR: `licensing-policy.json` + desktop activation client
- [ ] Deploy via Caffeine with forced clean rebuild (DDR-009)

## Testing

- Two Stripe sessions, same email → single union entitlement
- Activate machine A → success; machine B → reject
- Re-activate machine A before expiry → success
- No activation by day 31 → forfeited
- `generateLicense` as `licenseGenerator` → trap/unauthorized
