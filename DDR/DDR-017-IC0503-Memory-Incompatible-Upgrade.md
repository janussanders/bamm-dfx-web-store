# DDR-017: IC0503 memory-incompatible upgrade (actor shape + baseline)

**Date:** 2026-07-07  
**Status:** Implemented  
**Related:** [DDR-016](DDR-016-PremiumPurchase-M0170-Check-Stable-Baseline.md), [DDR-019](DDR-019-IC-Memory-Errors-vs-IC0503.md), [EntitlementMigration.mo](../src/backend/EntitlementMigration.mo)

## Not the same as runtime “out of memory”

IC0503 is an **upgrade-time** Motoko RTS error (`Memory-incompatible program upgrade`). It is **not** the ICP execution error `Canister cannot grow its memory usage` or `Wasm memory limit exceeded` during message execution. Do not apply runtime memory fixes (cycles top-up, `wasm_memory_limit`, sharding) to resolve IC0503 — see [DDR-019](DDR-019-IC-Memory-Errors-vs-IC0503.md).

## Problem

Caffeine backend upgrade failed on canister `rshnv-miaaa-aaaah-qqdva-cai` with **IC0503**:

> RTS error: Memory-incompatible program upgrade

## Root causes (two compounding issues)

### 1. `persistent actor` vs `actor` (memory layout)

PR #27 introduced `(with migration = …) **persistent actor** BAMM`. Live canisters (draft and production) were deployed as plain **`actor BAMM`** with `--default-persistent-actors` (commit **`02c10d9`** and earlier). Switching to explicit `persistent actor` changes enhanced orthogonal persistence heap layout → **IC0503** at `install_code`.

**Fix:** use `(with migration = EntitlementMigration.migration) actor BAMM` — same persistence mode as deployed canisters.

### 2. check-stable baseline too old (v119.0.3)

Live canisters expose `getLicensingPolicy` (added in `02c10d9`) but not `getEntitlementRegistry` (PR #26). They are **not** on tag `v119.0.3`. Pinning check-stable to v119 masked real upgrade compatibility during local build.

**Fix:** pin check-stable to `scripts/check-stable/backend-02c10d9.most` (7335-byte stable signature from last successful IC shape).

### 3. premiumPurchases migration (unchanged)

`EntitlementMigration.migration` still maps Legacy `PremiumPurchase` → add `entitlementId = ""`. That matches **`02c10d9`** and production — neither has `entitlementId` on purchases yet.

## Draft canister edge case (PR #26 partial)

If a canister was upgraded with **`ca3a3dc`** ( `entitlementId` already on `PremiumPurchase`, no migration), Legacy-input migration will fail at upgrade. **Recovery:** reinstall that canister (fresh install skips migration) or temporarily use identity migration (see DDR-016).

Probe: `getEntitlementRegistry` absent on both `rshnv-…` and `nae7q-…` as of 2026-07-07 → PR #26 not live; identity hotfix not required.

### 4. Caffeine backend build cwd (2026-07-08)

**Symptom:** IC0503 persisted on canister `ucnbj-nqaaa-aaaab-aajua-cai` even after tag **`v133.0.2`** (`actor BAMM` in source). Live probe: `getLicensingPolicy` OK, `getEntitlementRegistry` absent → canister still on **`02c10d9`** shape (not PR #26 / not `persistent actor` poison).

**Root cause:** `src/backend/caffeine.toml` ran `mops install` / `mops build` with Caffeine cwd `src/backend/`. `mops.toml` `[moc] args` include **`--default-persistent-actors`**; builds from the wrong cwd either fail or emit wasm without enhanced orthogonal persistence → upgrade from live canister traps **IC0503**.

**Fix (current — DDR-026):**

Place `src/backend/mops.toml` beside `main.mo` with `--default-persistent-actors`, then:

```toml
commands = ["mops install", "mops build", "pnpm bindgen"]
```

Do **not** `cd ..` (v133.0.10: parent outside Motoko sandbox). Import **`v133.0.11`**.

### 5. Poisoned draft canister (2026-07-08) — primary remaining blocker

Even with correct source + sibling `mops.toml`, **IC0503 on `ucnbj-nqaaa-aaaab-aajua-cai`** after repeated failed v133 upgrades means the **draft heap is incompatible**. More tags will not fix it.

**Recovery (DDR-027):**

1. Operator confirms platform **`redeploy_draft`** (reinstall draft backend `ucnbj-…` + draft frontend).
2. Does **not** touch production (PEM / installers / API codes on live stay).
3. Then agent **build only** — no import, no migration edits.
4. Durable blobs on draft are reset; that is expected and unrelated to the *cause* of IC0503 (DDR-019).

**Do not** reinstall production to clear draft IC0503. **Do not** “add entitlementId migration” — it already exists on `v133.0.11+`.

## Verification

```bash
npx -y ic-mops@latest build   # check-stable vs backend-02c10d9.most
```

After Caffeine import + (if needed) `redeploy_draft` + build: backend install succeeds; `getEntitlementRegistry` responds; Admin → Entitlements tab.

## Caffeine / platform agent note

If IC0503 persists on draft after importing **`v133.0.11+`**: request **`redeploy_draft`** for draft backend **`ucnbj-nqaaa-aaaab-aajua-cai`**, then build only. See [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md).
