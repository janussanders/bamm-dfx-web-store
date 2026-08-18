# DDR-043: Store cycles sentinel — memory-based remaining-time alerts

**Date:** 2026-08-18  
**Status:** Phase 1 implemented (dfx store watchdog + Admin NNS card). Phase 2 Motoko Super Admin SSOT not started. Caffeine `nae7q-…` remains retired.  
**Parent:** [DDR-007](DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md)  
**Related:** [DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md), [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md), [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md), [DDR-010](DDR-010-Email-Banner-Resend-Status.md), [DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md), [DDR-041](DDR-041-Store-Download-Upload-Throughput.md), [docs/dfx-ci-identity.md](../docs/dfx-ci-identity.md), [docs/dfx-deploy.md](../docs/dfx-deploy.md)

## Purpose

Keep [store.bammservice.com](https://store.bammservice.com/) online by measuring ICP **cycle balances** and **running memory** of the live dfx store, estimating when **1 month / 1 week / 1 day** of cycles remain, and emailing **every recorded Super Admin** with replenish links (NNS + store) and an estimated expiration date — before the canisters freeze.

This DDR is the ops lock for that sentinel. It does **not** change Caffeine production.

## Context (incident)

The dfx store hosts the public site **and** the Mac `.dmg` / Windows `.exe` installers on-canister ([DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md) Option A / [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md)). Heap therefore stays large (~250 MiB for both installers, plus wasm, Admin images, and the frontend asset canister).

The store already ran **out of cycles**. Recovery was:

1. Open the NNS accounts UI: [https://nns.internetcomputer.org/accounts](https://nns.internetcomputer.org/accounts)
2. Send ICP to the **GitHub CI identity** (cycles ledger used by Actions)
3. `dfx cycles convert` → `dfx cycles top-up` backend and frontend

There was no remaining-time estimate and no Super Admin email. Silence until the store froze is the failure this DDR closes.

### Live targets

| Role | ID / URL |
|------|----------|
| Storefront | https://store.bammservice.com/ |
| Frontend canister | `5xyyv-paaaa-aaaao-bbebq-cai` |
| Backend canister (installers + Motoko) | `5z2v5-uqaaa-aaaao-bbeaq-cai` |
| NNS (ICP source) | https://nns.internetcomputer.org/accounts |
| CI ICP account ID (send target) | `b2986df0bfef35a077a8d162726433b5a8d852d01cfa9352044c3c38e7dce98e` ([docs/dfx-ci-identity.md](../docs/dfx-ci-identity.md)) |

Do **not** monitor or top up Caffeine `nae7q-yaaaa-aaaai-atnvq-cai`.

## Two pools (do not conflate)

| Pool | What it pays | If empty |
|------|----------------|----------|
| **A. Canister balances** (backend + frontend) | Idle **memory** + updates, HTTPS outcalls (Stripe/RESEND), ingress | Store freezes: checkout/admin/timers stop |
| **B. GitHub CI cycles ledger** (`bamm-dfx-ci`) | Creates, installs, **`dfx cycles top-up` from Actions** | Canisters may still be up, but CI cannot replenish or deploy |

The previous incident touched **both**: canisters were dry, and ICP had to be moved from NNS → GitHub identity before a top-up. The sentinel watches **A as SSOT for store uptime** and **B as SSOT for “can we top up from CI?”**.

## Decision

Ship a **cycles sentinel** that:

1. Reads cycle count, memory size, reserved cycles, freeze threshold, and `idle_cycles_burned_per_day` for **both** store canisters (controller `canister_status`).
2. Estimates remaining time from **total running store memory** (protocol storage tariff) **floored by** replica-reported idle burn and observed Δcycles (captures outcalls/traffic the memory formula misses).
3. Fires **once per threshold band**: 1 month, 1 week, 1 day — to **each active `#superAdmin`** in `adminRecords`.
4. Puts the store URL, NNS accounts URL, canister IDs, CI send target, balances, memory, burn, and **estimated freeze / estimated zero** dates in the email.
5. Keeps an **out-of-band GitHub Actions watchdog** as primary, because an in-canister timer cannot email once the backend is frozen.

## Remaining-time model

### Inputs (per canister, then summed)

From management-canister `canister_status` (controller-only; `dfx canister status --network ic`):

| Field | Use |
|-------|-----|
| `cycles` | Spendable main balance |
| `reserved_cycles` | Not spendable for execution; report only |
| `memory_size` | Running Wasm + stable bytes (SSOT for “application memory”) |
| `idle_cycles_burned_per_day` | Replica idle burn (storage + allocations) |
| `settings.freezing_threshold` | Seconds of idle headroom before freeze (default **2_592_000** = 30 days) |
| `status` | `running` / `stopping` / `stopped` (frozen) |

Installer bytes on the backend (`macInstallerStore` + `windowsInstallerStore` totals) are a **component** of backend `memory_size`, not a second SSOT. Do not estimate from installer size alone — Admin images and Motoko heap count too.

### Memory tariff (protocol)

Application-subnet storage ([ICP cycle costs](https://docs.internetcomputer.org/references/cycle-costs/)):

```text
STORAGE_CYCLES_PER_GIB_PER_SEC = 127_000   # 13-node application subnet
SEC_PER_DAY = 86_400
GIB = 2^30 bytes

mem_gib_total = (backend.memory_size + frontend.memory_size) / 2^30
daily_from_memory = mem_gib_total * 127_000 * 86_400
```

If status shows a 34-node (fiduciary) subnet, scale by `34/13` (**332_153** cycles/GiB/s). Pin the multiplier from the subnet of the live canisters at implement time; do not guess.

Worked example (illustrative, ~250 MiB installers only):  
`0.244 GiB × 127_000 × 86_400 ≈ 2.7 B cycles/day ≈ 0.08 T/month`. Real store burn is **higher** once frontend assets, images, Stripe/RESEND outcalls, and downloads are included — hence the `max(...)` below.

### Daily burn SSOT

```text
daily_idle = backend.idle_cycles_burned_per_day + frontend.idle_cycles_burned_per_day
daily_observed = max(0, (prev.cycles_sum - now.cycles_sum) / elapsed_days)
                 # ignore snapshots spanning a top-up (cycles increased)
daily_burn = max(daily_idle, daily_from_memory, daily_observed)
```

- **Memory term** is the operator-requested model (installer-heavy store).
- **Idle term** is what the replica will actually charge while quiet.
- **Observed term** catches HTTPS outcalls and update traffic the idle figure understates.

If `daily_burn == 0`, treat remaining as unknown and still alert if either canister `status != running` or CI ledger is below the floor.

### Calendar math

Let `C = backend.cycles + frontend.cycles` (main balances only).

```text
days_to_zero   = C / daily_burn
freeze_days    = freezing_threshold_sec / 86_400          # usually 30
days_to_freeze = max(0, days_to_zero - freeze_days)
eta_freeze     = now + days_to_freeze
eta_zero       = now + days_to_zero
```

**Alert remaining time = `days_to_freeze`**, not `days_to_zero`. Default freeze is already ~30 days of idle burn; using `days_to_zero` for a “1 month” mail would fire as the store **freezes**. Emails must show both dates so operators are not surprised.

Also compute **per-canister** `days_to_freeze`. The store is down if **either** canister freezes. The alert band uses `min(backend, frontend, combined)`.

### Threshold bands

| Band | Fire when `days_to_freeze` first crosses | Subject prefix |
|------|------------------------------------------|----------------|
| **1 month** | `≤ 30` and `> 7` | `[BAMM store] 1 month of cycles left` |
| **1 week** | `≤ 7` and `> 1` | `[BAMM store] 1 week of cycles left` |
| **1 day** | `≤ 1` | `[BAMM store] 1 day of cycles left` |

Hysteresis: record `lastNotifiedBand`. Send **once per band per episode**. After a top-up that raises `days_to_freeze` above 30, reset to `none`. Do not re-send the 1-month mail every 6 hours.

### CI ledger band (pool B)

From `dfx cycles balance --network ic` on identity `ci` / `bamm-dfx-ci`:

| Floor | Meaning |
|-------|---------|
| `< 0.5 T` | Cannot reliably `top-up` + deploy ([DDR-007](DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md) measured ~2 ICP needed for create+install headroom) |

Include CI ledger in every threshold email. If canisters are healthy but CI ledger is below 0.5 T, send a **distinct** one-shot mail: GitHub cannot replenish until NNS ICP is converted.

## Architecture

```text
                    NNS accounts (ICP)
                    nns.internetcomputer.org/accounts
                              │ send ICP
                              ▼
                    GitHub CI identity cycles ledger
                              │ dfx cycles top-up
                              ▼
              ┌──────── backend 5z2v5… ────────┐
              │  Motoko + .dmg/.exe heap       │
              └────────────────────────────────┘
              ┌──────── frontend 5xyyv… ───────┐
              │  store.bammservice.com assets  │
              └────────────────────────────────┘

  GitHub Actions cron (primary watchdog; works if backend is frozen)
       │  dfx canister status backend+frontend
       │  dfx cycles balance
       ├─ if backend still running: call notifyCycleSnapshot (emails Super Admins via RESEND)
       └─ if backend frozen or call fails: RESEND fallback from Actions secrets
```

### Primary: GitHub Actions (out of band)

New workflow `.github/workflows/store-cycles-sentinel.yml`:

- `on.schedule`: every **6 hours** (`0 */6 * * *`) plus `workflow_dispatch`
- Same identity import as deploy (`DFX_IDENTITY_PEM`, `DFX_WARNING=-mainnet_plaintext_identity`) — **status only**, never `dfx deploy`, never `--mode reinstall`
- Parse `dfx canister status` for both canisters + `dfx cycles balance`
- Persist last snapshot + `lastNotifiedBand` as a small JSON artifact or cache keyed by run (durable store: append-only Motoko fields when Phase 2 is live; until then GitHub Actions cache + the Motoko fields after upgrade)
- Write a job summary with balances, memory, ETAs

**Lock:** This workflow must not deploy. Cycle top-up from CI remains an **operator** action (or a future explicit `workflow_dispatch` input `top_up=false` by default). Auto-top-up is out of scope — it would spend NNS-funded ICP without a human at the 1-month warning.

### Secondary: Motoko (in band, Super Admin SSOT)

Backend already owns:

- `adminRecords` with `#superAdmin` + `#active` + `email` ([DDR-001](DDR-001-Admin-Roles-RBAC.md) lineage)
- `sendPlainEmailWithResend` + email logs ([DDR-005](DDR-005-Email-Delivery-Logs.md) / [DDR-010](DDR-010-Email-Banner-Resend-Status.md))

Add **append-only** actor fields **after** `windowsUploadChunks` ([DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md) / [DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md)):

```text
var cycleSentinelLastSnapshot : ?{
  atNs : Int;
  backendCycles : Nat;
  frontendCycles : Nat;          # 0 until CI reports it
  backendMemory : Nat;
  frontendMemory : Nat;
  dailyBurn : Nat;
  daysToFreezeE6 : Nat;          # fixed-point days * 1e6, or store as Text
};
var cycleSentinelLastNotifiedBand : { #none; #month; #week; #day };
var cycleSentinelCiPrincipal : ?Principal;  # optional allow-list for notifyCycleSnapshot
```

APIs (conceptual):

| Method | Auth | Role |
|--------|------|------|
| `getCycleHealth` | Super Admin (and CI principal) | Snapshot + ETAs + installer byte totals for the Admin card |
| `notifyCycleSnapshot` | Caller is **controller** or `cycleSentinelCiPrincipal` | Ingest CI-measured frontend+backend status; evaluate bands; email Super Admins |
| `previewCycleAlert` | Super Admin | Send one test mail to the caller’s admin email only |

A canister can `canister_status` **itself**. It cannot status the frontend unless it is a frontend controller. **Do not** add the backend as a frontend controller just for this. CI (already controller of both) supplies the frontend numbers into `notifyCycleSnapshot`.

Optional Motoko `Timer.recurringTimer` (e.g. 6 h) may self-status the backend and email if CI has not reported within 12 h. It is a **backup**, not the freeze watchdog.

### Recipients

```text
for each adminRecords entry:
  role == #superAdmin AND status == #active AND email contains "@"
```

- Pending / deactivated Super Admins are **not** mailed (stale inboxes).
- Administrators and below are **not** mailed (they cannot move NNS ICP / CI identity).
- If that set is empty, use GitHub secret `CYCLE_ALERT_FALLBACK_EMAILS` (comma-separated) so a pre-claim canister still alerts the operator.
- One email **per** Super Admin (existing `sendPlainEmailWithResend`), not a single BCC that RESEND may reject.

### RESEND fallback (backend frozen)

GitHub secrets:

| Secret | Use |
|--------|-----|
| `DFX_IDENTITY_PEM` | Already required for deploy; reused for status |
| `RESEND_API_KEY` | Fallback send when `notifyCycleSnapshot` cannot run |
| `CYCLE_ALERT_FALLBACK_EMAILS` | Used if no Super Admin emails / backend frozen |

Fallback is operationally required: at the **1-day** band the backend may already refuse updates. Do not make RESEND-in-Motoko the only path.

## Email contract

Every 1 mo / 1 wk / 1 day message **must** include:

1. **Band** and **estimated freeze date** (ISO date, UTC) and **estimated zero date**
2. Store: https://store.bammservice.com/
3. NNS (replenish ICP): https://nns.internetcomputer.org/accounts
4. Backend / frontend canister IDs
5. Per-canister: cycles (T), memory (MiB), `idle_cycles_burned_per_day`, status
6. Combined: `mem_gib_total`, `daily_burn` (which term won: idle / memory / observed), `days_to_freeze`
7. Installer contribution: Mac+Windows stored bytes vs backend `memory_size`
8. CI cycles ledger balance and the CI ICP **account ID** to send to
9. Replenish steps (short):

```text
1. https://nns.internetcomputer.org/accounts → send ICP to
   b2986df0bfef35a077a8d162726433b5a8d852d01cfa9352044c3c38e7dce98e
2. dfx identity use bamm-dfx-ci
   dfx cycles convert --amount <ICP> --network ic
   dfx cycles top-up backend  <cycles> --network ic
   dfx cycles top-up frontend <cycles> --network ic
3. Confirm: dfx canister status backend --network ic
            dfx canister status frontend --network ic
4. Store: https://store.bammservice.com/
```

10. Explicit: topping up cycles does **not** fix IC0503 ([DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md)).
11. Log via `logEmailInternal` with a distinct subject prefix so Admin → Email logs can filter `cycle_sentinel` (DDR-005 transaction shape: one row per alert episode, not per Super Admin, if easy; otherwise one row per send is acceptable).

Subject examples:

- `[BAMM store] 1 month of cycles left — freeze ~ 2026-09-17`
- `[BAMM store] 1 week of cycles left — freeze ~ 2026-08-25`
- `[BAMM store] 1 day of cycles left — freeze ~ 2026-08-19`

## Admin UI

Super Admin–only **Cycles** card on Admin (not Features Manager / License Generator):

- Combined and per-canister cycles, memory, daily burn, ETAs
- Last sentinel run timestamp
- Last notified band
- “Send test alert” → `previewCycleAlert`
- Link buttons: Store, NNS accounts

**Phase 1 (shipped):** Admin → Admin Management → **NNS account & dfx cycles** card (NNS URL, CI account ID, pinned dfx canister IDs, IC dashboard, sentinel workflow). GitHub Actions **Store cycles sentinel** (`store-cycles-sentinel.yml`) is status-only: no deploy, no reinstall, no `canister create`, no Caffeine. Live cycle ETAs live in the workflow summary; emails use `CYCLE_ALERT_FALLBACK_EMAILS` until Phase 2.

**On-card remaining clocks (`dd/mm/yy hh:mm:ss`):** [DDR-044](DDR-044-Admin-Cycles-Remaining-Clocks.md) (proposed addition — freeze instant + ticking remaining; no Motoko).

## Phased delivery (IC0503-aware)

Live backend may be **layout-locked** ([DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md)). Do not block alerting on a Motoko upgrade.

| Phase | Ships | Deploy |
|-------|--------|--------|
| **1 — Watchdog** | Scheduled workflow + status parse + formula + RESEND fallback + `CYCLE_ALERT_FALLBACK_EMAILS` + Admin NNS card | **No** canister deploy (frontend-only later for the Admin card; never reinstall) |
| **2 — Super Admin SSOT** | Append-only sentinel fields + `notifyCycleSnapshot` / `getCycleHealth` + Admin card | `canisters=backend` then `frontend`; on IC0503 stop, keep Phase 1, escalate reinstall/migration |
| **3 — Optional** | Motoko timer backup; raise `freezing_threshold` to 90 days (`7_776_000`) **after** balances support it | Backend settings / deploy |

Phase 1 is sufficient to prevent a repeat of silent freeze. Phase 2 is required to honor “each Super Admin **recorded**” without a drifting GitHub secret.

## Security / locks

- Never log RESEND API keys, PEMs, or full status blobs that include controllers’ secrets.
- `notifyCycleSnapshot` is **not** anonymous: controller or pinned CI principal only. Do not add a public query that returns Super Admin emails.
- Sentinel workflow: **status + optional notify**, never reinstall, never Caffeine.
- Do not auto-convert ICP or auto-top-up.
- Fallback email secret is operator-maintained until Phase 2; after Phase 2 it is last-resort only.

## Success criteria

1. A dry-run `workflow_dispatch` prints combined memory, daily burn, `days_to_freeze`, and ETAs for both live canisters.
2. Crossing each band sends one email per active Super Admin (or fallback list in Phase 1) containing both URLs, CI account ID, and freeze date.
3. Top-up that restores `days_to_freeze > 30` resets the band; the next decay can alert again.
4. When backend is stopped/frozen, Actions still sends the fallback mail (proven by a staged `status=stopped` fixture or by calling RESEND with a synthetic snapshot in CI — not by freezing production).
5. No `dfx deploy` from the sentinel workflow.
6. Phase 2 fields appear only after `windowsUploadChunks` in `main.mo`.

## Out of scope

- Moving `.dmg`/`.exe` off Motoko heap (DDR-003 Option B / DDR-041) — would **lower** `daily_from_memory` but is a separate change.
- Caffeine `bamm-gw3` / `nae7q-…`.
- Automatic NNS withdrawals or SNS/neurons as a funding source.
- USD invoicing; cycles and dates only (USD in the email is optional and must be labeled approximate).

## Consequences

- Operators get calendar warning instead of discovering freeze via a dead storefront.
- Memory-weighted burn matches how this store actually spends cycles (installer heap).
- GitHub ICP replenish from NNS stays the documented recovery path; the mail is the runbook.
- Phase 1 does not risk IC0503; Phase 2 follows append-only + DDR-038.

## Agent locks

- Do not treat MCP, Stripe, or Admin “email ready” as cycle health.
- Do not implement auto-top-up in the sentinel.
- Do not insert sentinel `var`s in the middle of `main.mo`.
- Do not use Caffeine `redeploy_draft` or cycle top-up as an IC0503 fix.
- When implementing, update [docs/dfx-ci-identity.md](../docs/dfx-ci-identity.md) with the workflow name and keep the NNS + CI account ID tables in sync.
