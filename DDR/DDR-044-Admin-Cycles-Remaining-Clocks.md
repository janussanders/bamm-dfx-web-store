# DDR-044: Admin remaining-time clocks (`dd/mm/yy hh:mm:ss`)

**Date:** 2026-08-18  
**Status:** Implemented (Admin clocks + `cycles-health` snapshot). Frontend-only deploy ships the card; sentinel still does not deploy canisters.  
**Parent:** [DDR-043](DDR-043-Store-Cycles-Expiry-Alerts.md)  
**Related:** [DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md), [docs/dfx-ci-identity.md](../docs/dfx-ci-identity.md)

## Purpose

On Admin → **Admin Management** → **NNS account & dfx cycles**, show **remaining freeze time as clocks an admin can read at a glance**: freeze instant and remaining duration in **`dd/mm/yy hh:mm:ss`**, ticking while the page is open.

This is an **addition** to the shipped Phase 1 card (NNS link, CI account ID, canister IDs). It does **not** replace emails, the GitHub sentinel, or Motoko. Caffeine `nae7q-…` stays retired. Backend `.dmg` / `.exe` stay on `5z2v5-…` (no reinstall).

## Problem

Phase 1 shipped links and public IC index metadata. Cycle **balance and freeze ETA live only in the Actions job summary**. The card’s `IC index updated …` line is **not** remaining cycles. Admins should not have to leave Admin Management to answer “when does the store freeze?”

## Decision

### 1. What the card must show (normative)

All times on this card use **UTC**, labeled `UTC`. Date-time strings use **day/month/year + 24h clock**, zero-padded:

```text
dd/mm/yy hh:mm:ss
```

Example: freeze at `17/09/26 14:30:00` UTC.

| Row | Indicator | Format | Updates |
|-----|-----------|--------|---------|
| **Freeze at** | Instant the store is estimated to freeze (DDR-043 `etaFreeze`, min of backend/frontend) | `dd/mm/yy hh:mm:ss` UTC | When snapshot refreshes |
| **Remaining** | Time left until freeze | Live `DDDd HH:mm:ss` (days + hours:minutes:seconds), tick 1s | Every second on the open page |

The `dd/mm/yy` pattern for a **duration** is ambiguous (yy is a year). Do **not** overload year as hours.

**Lock — two fields, one visual family:**

1. **Freeze at (UTC):** `dd/mm/yy hh:mm:ss` — calendar clock (day / month / 2-digit year, then hour:minute:second).
2. **Remaining:** `DDDd HH:mm:ss` — duration clock (days, then hours:minutes:seconds), **ticking every 1s** in the browser from `etaFreeze`. When remaining is under 24h, still show `000d HH:mm:ss` (or `00d` for under 100 days with 2-digit days). Never show a negative remaining; clamp to `000d 00:00:00` and badge **frozen / past due**.

Optional third line, same calendar format:

3. **Zero at (UTC):** `dd/mm/yy hh:mm:ss` — DDR-043 `etaZero` (cycles exhausted after freeze buffer). Smaller/muted type so freeze remains the action clock.

Repeat **Freeze at** + **Remaining** on each canister tile (backend vs frontend) using that canister’s own ETA. Combined block sits **above** the two tiles and is the primary number.

**Band color (remaining to freeze):**

| Remaining | Badge |
|-----------|--------|
| `> 30d` | Neutral / green **healthy** |
| `≤ 30d` and `> 7d` | Amber **1 month** |
| `≤ 7d` and `> 1d` | Orange **1 week** |
| `≤ 1d` or stopped | Red **1 day** / **frozen** |

**Stale:** if snapshot `at` is older than **12 hours**, show **sentinel stale** (clocks still tick from last ETA; admin must not treat them as a fresh `dfx canister status`).

**Last measured:** snapshot `at` also as `dd/mm/yy hh:mm:ss` UTC so “as of” is obvious.

Do **not** use `toLocaleString()` as the SSOT for these clocks (it follows the laptop locale and mixes US `mm/dd`). Locale may appear only as a secondary tooltip.

### 2. Data source (no Motoko, no artifact wipe)

Browser callers are **not** canister controllers. `canister_status` / cycle balance stay on the GitHub sentinel ([DDR-043](DDR-043-Store-Cycles-Expiry-Alerts.md)).

**Publish a public health snapshot** the Admin card can `fetch`:

| Item | Value |
|------|--------|
| File | `ops/cycles-health.json` |
| Git | Dedicated branch **`cycles-health`** (orphan / single-file). Sentinel **force-updates that branch only** — not `main`, no wasm, no `dfx deploy` |
| URL | `https://raw.githubusercontent.com/janussanders/bamm-dfx-web-store/cycles-health/ops/cycles-health.json` |
| Cadence | Each successful sentinel run (~6h) |
| CORS | GET JSON; cache-bust with `?t=` snapshot `atMs` or `Date.now()` on load |

JSON **must** include (no emails, no PEM, no RESEND):

```json
{
  "schema": "bamm-dfx-cycles-health/v1",
  "at": "2026-08-18T15:49:00.000Z",
  "atMs": 1755532140000,
  "backendId": "5z2v5-uqaaa-aaaao-bbeaq-cai",
  "frontendId": "5xyyv-paaaa-aaaao-bbebq-cai",
  "etaFreeze": "2026-09-17",
  "etaZero": "2026-10-17",
  "daysToFreeze": 29.4,
  "daysToZero": 59.4,
  "band": "month",
  "backend": { "status": "running", "etaFreeze": "…", "daysToFreeze": 31.0 },
  "frontend": { "status": "running", "etaFreeze": "…", "daysToFreeze": 29.4 }
}
```

`etaFreeze` in Phase 1 is a **UTC date** (`YYYY-MM-DD`). For `hh:mm:ss` on the card, treat that date as **`00:00:00` UTC** unless the snapshot also sends an ISO datetime (`etaFreezeAt`). **Addition in the sentinel:** emit `etaFreezeAt` / `etaZeroAt` as full ISO timestamps (`atMs + daysToFreeze * 86400000`) so remaining seconds are real, not midnight-only.

Refuse to render if `backendId` / `frontendId` are not the pinned dfx IDs, or if either equals Caffeine `nae7q-yaaaa-aaaai-atnvq-cai`.

### 3. What not to do

- Do **not** `dfx deploy` / install / reinstall / `canister create` from the sentinel (DDR-043 lock). Publishing `cycles-health` is **git only**.
- Do **not** upgrade Motoko for this card (DDR-038). Frontend-only deploy ships the clock UI.
- Do **not** interrupt the packaged BAMM desktop app (`localhost:3000`, Electron, `trades-runtime`).
- Do **not** show Caffeine canisters or Caffeine NNS accounts.
- Do **not** put Super Admin email addresses in the public JSON.

### 4. Ship sequence

| Step | Change | Deploy |
|------|--------|--------|
| A | Sentinel: ISO `etaFreezeAt` / `etaZeroAt` + publish `ops/cycles-health.json` on branch `cycles-health` | None (git branch only) |
| B | Admin card: fetch JSON, **Freeze at** `dd/mm/yy hh:mm:ss`, **Remaining** `DDDd HH:mm:ss` per 1s tick, band colors | **Frontend-only** `5xyyv-…` |
| C | (Later, DDR-043 Phase 2) Motoko `getCycleHealth` can replace the GitHub JSON for Super Admins | Backend only if layout-safe |

## Success criteria

1. Admin Management shows combined **Freeze at** as `dd/mm/yy hh:mm:ss` UTC and a ticking **Remaining** `DDDd HH:mm:ss`.
2. Backend and frontend tiles each show their own pair of clocks.
3. After freeze instant, remaining is `000d 00:00:00` with a red frozen badge — not `NaN` or a US locale date.
4. Snapshot IDs are dfx `5z2v5-…` / `5xyyv-…` only.
5. Sentinel still does not deploy canisters; installer blobs on the backend are unchanged.

## Consequences

Admins read remaining store life on the same page as the NNS replenish link, in one date-time convention, without opening GitHub. Freeze math stays DDR-043; this DDR only defines **how remaining is shown** and **how the card gets a snapshot without Motoko**.
