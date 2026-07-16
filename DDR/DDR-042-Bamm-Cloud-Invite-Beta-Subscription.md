# DDR-042: BAMM Cloud — Invite-Only Beta Hybrid Orchestration (Store)

**Status:** Proposed — **Hybrid A+B locked**  
**Date:** 2026-07-16  
**Authors:** BAMM Engineering  
**Companion:** [BAMM `2026-07-16-bamm-cloud-invite-beta-hosted-subscription.md`](https://github.com/janussanders/BAMM/blob/main/docs/ddr/enterprise/2026-07-16-bamm-cloud-invite-beta-hosted-subscription.md)

---

## Context

`store.bammservice.com` sells one-time licenses and II-gated admin today. **BAMM Cloud** is an invite-only monthly subscription that must deliver:

- **Path A:** Networked entitlement + desktop installer access (fast)  
- **Path B:** Hosted Azure runtime URL (async provision)  
- Shared **II + superadmin OTP** for both  

Store orchestrates; Motoko does **not** run Electron.

---

## Decision

### Hybrid control plane

| Owns | Does not own |
|------|----------------|
| Stripe subscription checkout + poll | Electron / desktop process |
| Invite allowlist + OTP | Per-user Motoko “desktop canisters” |
| II ↔ subscription binding | Azure compute (external provisioner) |
| Dual statuses: `desktop_status`, `hosted_status` | Automatic A↔B data sync (beta) |
| Staged emails + support failure payloads | Inbound Stripe webhooks |

Path B runtimes follow [BAMM Azure Container Apps runtime contract](https://github.com/janussanders/BAMM/blob/main/docs/ddr/enterprise/2026-07-04-azure-container-apps-runtime-contract.md).

### SKU

- Id: `bamm_cloud_beta_monthly`
- Mode: Stripe Billing `subscription` (monthly)
- Entitles **both** Path A and Path B
- Gate: invite allowlist before checkout (**prefer block** if not invited)

### Dual-track state machine

```
invited
  → checkout_started
  → paid
       ├─ desktop_status: pending → ready | failed
       └─ hosted_status:  pending → provisioning → ready | failed_manual
  → suspended | canceled
```

**Rule:** `hosted_status=failed_manual` must not clear `desktop_status=ready`.

Idempotency: Stripe `session_id` / `subscription_id` (DDR-004 spirit).

### Superadmin surfaces

1. Invite allowlist  
2. OTP generate / revoke / resend  
3. Cloud subscriptions: Stripe ids, `desktop_status`, `hosted_status`, `access_url`, errors  
4. Capacity: cycles, hosted seat count vs `beta_cap` (≤25), queue depth  
5. Independent resend: desktop email vs hosted email  

### Email sequence (hybrid)

| Trigger | Email |
|---------|--------|
| Paid | Receipt — “Beta setup” |
| `desktop_status=ready` | Entitlement + OTP + II + installer links |
| `hosted_status=ready` | Cloud URL + II/OTP reminder |
| `hosted_status=failed_manual` | Client: hosting delayed; Support: structured payload (**desktop still mentioned as available**) |
| OTP regenerate | OTP only |

### Capacity preflight (Path B only)

1. Backend cycles ≥ floor  
2. `active_hosted_tenants + queued < beta_cap`  
3. Provisioner enabled / Azure quota OK  

Fail → `hosted_status=failed_manual`; Path A unaffected.

### Auth

| Track | Gate |
|-------|------|
| A | II (as required by activation) + OTP + active Stripe → entitlement activate/refresh |
| B | II + OTP + active Stripe → short-lived hosted session/redirect token |

### Fulfillment API shape (conceptual)

- Parallel to DDR-004 one-time flow — do **not** overload `fulfillPaidLicense` alone.  
- e.g. `fulfillCloudSubscription` → sets paid + kicks Path A issuance.  
- e.g. `reportCloudHostedProvision` (provisioner callback, admin-authenticated) → `ready` / `failed_manual`.  
- No inbound Stripe webhooks — poll + reconcile.

### Data planes (beta)

Desktop local data ≠ hosted Azure Files. Store copy must say so. No sync in CB launch; export/import only.

---

## Engineering gaps (store)

| Gap | Work |
|-----|------|
| Stripe subscriptions | `subscription` mode; poll; cancel reconcile |
| Contracts | `bamm_cloud_beta_monthly` + tier sync |
| Motoko | Append-only invite/OTP/dual-status fields (DDR-006) |
| Admin UI | Invite, OTP, dual status, capacity, dual resend |
| Emails | Four+ Cloud templates + DDR-005 logs |
| Provisioner callback | Authenticated hosted status updates |
| Path A issuance | Entitlement artifact generation / activation handoff |
| Legal | Dual-boundary Cloud beta copy on SKU page |

---

## Success criteria

1. Allowlisted pay → Path A email within ~2 minutes.  
2. Path B ready within ~30 minutes **or** failed_manual + support ≤15 minutes without killing A.  
3. Same OTP/II for both tracks.  
4. Superadmin can resend desktop vs hosted independently.  
5. No Motoko field implying “runs Electron.”  
6. Backend field adds follow DDR-006 / deploy with DDR-038 awareness.

---

## Probability (store-scoped)

| Milestone | Prob. |
|-----------|--------|
| CB1–CB2 store + Path A | **~75–85%** |
| + Path B callback/emails | **~55–65%** hybrid E2E |
| Per-user dfx desktop canister | **~0%** |

---

## Consequences

- Hybrid A+B is the locked store product shape for BAMM Cloud beta.  
- Docs-only here; implement behind Stripe Billing + append-only state + provisioner.  
- Caffeine production unchanged.
