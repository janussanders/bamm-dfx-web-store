# DDR-038: IC0503 deploy decision tree (dfx)

**Date:** 2026-07-13  
**Status:** Implemented (process lock)  
**Parent:** [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md)  
**Related:** [DDR-007](DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md), [DDR-019](DDR-019-IC-Memory-Errors-vs-IC0503.md), [docs/dfx-deploy.md](../docs/dfx-deploy.md)

## Why some IC deploys succeed and others fail

| Deploy target | Typical result | Why |
|---------------|----------------|-----|
| `canisters=frontend` | **Success** | Asset canister only (workflow clears frontend→backend dependency so Motoko is not upgraded) |
| `canisters=all` / `backend` with **same** module hash already on chain | **Success** (no-op) | dfx reports “Module hash … is already installed” |
| `canisters=all` / `backend` with a **new** Motoko wasm | **IC0503** when layout ≠ live heap | Motoko EOP rejects incompatible actor field layout (`Memory-incompatible program upgrade`) |

Observed pattern (2026-07-13): frontend-only Actions runs succeed; `Deploying all canisters` fails IC0503 whenever the candidate backend wasm differs from the live module. A prior “all” success on 2026-07-12 was a **same-hash no-op**, not proof that layout-changing (or even method-only) upgrades are safe.

IC0503 is **not** cycles, DNS, or “out of memory.” Topping up the cycles ledger does not fix it.

## Root causes (this repo)

1. **EOP field order** — new `let`/`var` must be appended after the last existing actor field ([DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md)). Mid-file inserts poison upgrades.
2. **Poisoned / frozen live layout** — after a past incompatible upgrade path (or reinstall baseline), the live canister may reject **any** new wasm until a compatible migration or operator-approved **reinstall**.
3. **Wrong mental model** — Caffeine draft `redeploy_draft` does **not** apply here. Dfx production backend wipe = `dfx canister install --mode reinstall` with explicit operator approval only.

Method-only Motoko changes *should* upgrade cleanly when the live layout matches what current `moc` emits. If they still IC0503, treat the live backend as **layout-locked** and ship UI via frontend-only until an operator reinstall (or a Motoko migration) is approved.

## Permanent agent / operator procedure

### Default

```text
UI, copy, Admin panels, landing images → canisters=frontend
```

```bash
gh workflow run "Deploy dfx (IC)" -f network=ic -f deploy=true -f canisters=frontend
```

### Backend needed (new query/update methods, Motoko logic)

1. Confirm no mid-list field inserts:

   ```bash
   rg -n '^  (var |let )' src/backend/main.mo
   ```

2. Deploy `canisters=backend` (or `all`).
3. On **IC0503**:
   - Do **not** keep retrying `all`.
   - Ship what you can with `canisters=frontend`.
   - Document the blocked Motoko API.
   - Ask the operator whether to **reinstall** (data wipe) or wait for a Motoko migration plan.

### New persistent state

1. Append new `let`/`var` **only after** the last field in source order (today: after `windowsUploadChunks`).
2. Prefer upgrade; use reinstall only with operator approval + [DDR-007](DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md) post-reinstall checklist.

### Forbidden

- Reinstall without explicit operator approval
- Inserting fields “near related code” in the middle of `main.mo`
- Treating IC0503 as cycles / Caffeine draft recovery
- Claiming backend APIs are live after a frontend-only deploy

## Permanent technical fix (when operator is ready)

One clean **backend reinstall** after freezing field order, then:

- Append-only fields forever (DDR-006)
- Frontend-only for UI by default (this DDR)
- Rare backend upgrades for Motoko API / state

Until then, frontend-only is the supported production path for storefront UX.

## Consequence

Agents have a single decision tree: prefer frontend; attempt backend only when Motoko must change; on IC0503 stop and escalate reinstall/migration rather than burning cycles on repeated `all` deploys.
