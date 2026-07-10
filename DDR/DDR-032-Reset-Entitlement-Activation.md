# DDR-032: Admin reset entitlement activation (support re-bind)

**Date:** 2026-07-09  
**Status:** Approved  
**Related:** [DDR-028](DDR-028-Entitlement-Registry-Backfill.md), [DDR-030](DDR-030-Admin-License-Management-V2.md), networked entitlement activation DDR

## Problem

Desktop activation can fail (e.g. Node 16 missing `fetch` → canister id unresolved) while support/debug calls may bind an entitlement to a test machine digest. Customers then see “already active on another computer” or cannot finish setup. Registry correctly keeps **one row per email**; clutter is avoided by merging purchases under that row — but there was no admin way to clear a bad machine binding without deleting the entitlement.

## Decision

Add admin API `resetEntitlementActivation(entitlementId)`:

- Role: `#administrator`+
- Clears `machineBindingDigest`, `activatedAtNs`, `expiresAtNs`
- Sets status `#pending_activation`
- Issues a **new** `activationNonce` and fresh 30-day activation window
- Workflow step: `entitlement_activation_reset`
- Does **not** remove the registry row or linked purchases (one email → one entitlement)

## Registry clutter note

`upsertEntitlementFromPurchase` already keys by normalized email. New Stripe payments for the same email **merge** into the existing entitlement (features union + linked purchases). New emails create a new row. UI copy clarifies this.

## Companion desktop fix

Packaged BAMM backend is Node 16 (`pkg`) without global `fetch`. `entitlementActivationService` must polyfill `node-fetch` and fall back to production canister id `nae7q-yaaaa-aaaai-atnvq-cai` when `env.json` cannot be loaded. That fix lives in the BAMM desktop repo (separate branch).

## Verification

```bash
cd src/backend && npx -y ic-mops@latest build
# After deploy: Admin can reset a bound entitlement; desktop Finish Premium setup succeeds with real machine digest
```
