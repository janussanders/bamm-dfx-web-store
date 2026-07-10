# DDR-030: Admin License Management issues v2 networked licenses

**Date:** 2026-07-08  
**Status:** Approved  
**Related:** [DDR-028](DDR-028-Entitlement-Registry-Backfill.md), [docs/ddr/2026-07-07-networked-license-entitlement-activation.md](../docs/ddr/2026-07-07-networked-license-entitlement-activation.md)

## Problem

Admin → **License Management** (`generateLicense` / `sendManualLicense`) still signed **v1** payloads via `buildLicensePayloadJson` (no `schema_version`, no `entitlement_id`). Desktop treated those as `phase: 'legacy'` and never called IC `activateEntitlement`.

Stripe fulfillment already used `upsertEntitlementFromPurchase` + `buildSignedEntitlementLicense` (v2 grace). Admin paths were inconsistent.

DDR-028 explicitly left this as out of scope (“Trial / admin `generateLicense` → entitlement (still legacy path)”).

## Decision

Route both admin license endpoints through the same networked entitlement path as paid fulfillment:

| Endpoint | Behavior |
|----------|----------|
| `generateLicense` | `upsertEntitlementFromPurchase` → `buildSignedEntitlementLicense` → record `generated_v2` → optional email with 30-day activation copy |
| `sendManualLicense` | Same; record `manual_send_v2`; email always |

Workflow log steps: `admin_license_generated`, `admin_manual_send`, `license_emailed`.

Admin UI copy states v2 / grace / 30-day activation. Query invalidation refreshes Entitlements registry after generate/send.

**Unchanged:** Trial licenses remain v1 (`buildLicensePayloadJson`) until a separate DDR.

## Operator notes

1. Deploy tag with this change (Caffeine import → build → promote; DDR-027 / IC0503 redeploy_draft if needed).
2. Manual Send / Generate now creates Entitlements tab rows.
3. Desktop after install: expect `schema_version: 2`, `phase: 'grace'`, `needsActivation: true` until machine activation.
4. Existing v1 admin-issued licenses stay legacy until expiry; re-send to migrate a customer to v2.

## Verification

```bash
cd src/backend && npx -y ic-mops@latest build
# After deploy: Manual Send → Entitlements shows new row; license JSON has "schema_version":2
```

## Out of scope

- Trial license → v2
- Auto-converting historical v1 license records
- Desktop client changes (already supports v2)
