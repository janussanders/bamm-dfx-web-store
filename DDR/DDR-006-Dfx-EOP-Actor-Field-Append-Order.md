# DDR-006: EOP actor field append order (IC0503 Memory-incompatible)

**Date:** 2026-07-10  
**Status:** Implemented (process lock)  
**Parent:** [DDR-001](DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md)  
**Related:** Legacy Caffeine [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md) (different causes), [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md)

## Failure mode (observed)

`dfx deploy` / `dfx canister install --mode upgrade` of the Motoko backend trapped:

```text
RTS error: Memory-incompatible program upgrade
error code IC0503
```

Upgrade rolled back; canister kept the previous wasm. This blocked shipping chunked installer state until a **reinstall** (data wipe).

## Root cause (this repo)

With **enhanced orthogonal persistence** (`--default-persistent-actors` in `mops.toml` `[moc] args`), Motoko keeps the heap across upgrades and **rejects incompatible type-layout changes**.

Actor `let` / `var` fields are ordered by **source appearance**, including fields declared **late** in the file (among functions). In `main.mo`, `trialExcludedFeatures` is declared **after** the installer file vars, deep in the actor body.

Inserting new persistent fields **between** `windowsInstallerFile` and `trialExcludedFeatures` shifted the layout → **Memory-incompatible** even though the new fields were “after the installer block” in the early var section.

Also incompatible:

- Inserting a new `let` **before** existing early vars (e.g. before `userSubmissions`)
- Module-level `let` outside `actor BAMM` (Motoko forbids non-import decls beside the actor)

## Decision

1. **Append-only** for new persistent actor state: add new `let`/`var` **after the last pre-existing actor field** in source order (today: after `trialExcludedFeatures`).
2. Before any backend upgrade that adds state, list fields:

   ```bash
   rg -n '^  (var |let )' src/backend/main.mo
   ```

   New fields must appear **only at the end** of that list (or use an explicit Motoko **migration** module — prefer append for empty/additive stores).
3. Prefer **upgrade** (`dfx deploy`) so Stripe / RESEND / PEM / admins / installers survive.
4. **Reinstall** (`--mode reinstall`) only when upgrade is impossible; treat as **data loss** — operator must re-claim Super Admin (DDR-002) and re-enter secrets. Document in the PR/run notes.
5. Do not confuse this with Caffeine IC0503 causes (wrong moc flags, `persistent actor` vs `--default-persistent-actors`, poisoned draft heap) — see legacy DDR-017 / DDR-019.

## Agent locks

- Do **not** insert new persistent fields in the middle of `main.mo` “near related code” without checking full field order.
- Do **not** move existing fields around to “clean up” without a migration plan.
- Do **not** reinstall production/staging canisters without explicit operator approval.

## Verify before merge

```bash
npx -y ic-mops@latest build
# Confirm new fields are last:
rg -n '^  (var |let )' src/backend/main.mo | tail -30
```

After deploy: module hash changes; `dfx canister status backend --network ic` shows new hash; prior admin/config still present if upgrade (not reinstall).

## Consequence

Chunked installer stores and future features can ship via upgrade without wiping the parallel store — if and only if field append order is respected.

## Deploy outcome pattern (see DDR-038)

Frontend-only deploys succeed; backend/`all` succeed only when the candidate wasm matches the live module hash (no-op) or the EOP layout is compatible. Repeated IC0503 on method-only Motoko edits means the live canister is **layout-locked** — use [DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md) (frontend-only by default; operator reinstall / migration for permanent unlock).
