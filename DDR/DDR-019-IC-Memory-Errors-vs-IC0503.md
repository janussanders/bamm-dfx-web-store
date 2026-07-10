# DDR-019: ICP memory execution errors vs IC0503 (upgrade layout)

**Date:** 2026-07-08  
**Status:** Approved  
**Related:** [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md), [DDR-018](DDR-018-Caffeine-Import-Runbook.md), [ICP execution errors — instruction and memory limits](https://docs.internetcomputer.org/references/execution-errors/#instruction-and-memory-limit-errors)

## Purpose

Operators and agents often conflate **IC0503** (`RTS error: Memory-incompatible program upgrade`) with unrelated ICP **runtime memory** errors (`Canister cannot grow its memory usage`, `Wasm memory limit exceeded`, etc.). This DDR maps the official ICP error taxonomy to the BAMM backend canister and records **what we must not change** when investigating memory failures — so fixes for one class do not regress [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md).

## Error taxonomy (BAMM backend)

| Symptom / message | When it happens | BAMM relevance | Correct response |
|-------------------|-----------------|----------------|------------------|
| **IC0503** — `Memory-incompatible program upgrade` | `install_code` / canister **upgrade** | **Primary failure we hit** (2026-07-07/08) | [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md): `actor BAMM` + repo-root mops + `--default-persistent-actors`; tag **v133.0.3+** |
| **Out of memory** — `Canister cannot grow its memory usage` | **Message execution** (update/query) | Not observed on BAMM backend today; distinct from IC0503 | `icp canister status`; profile with [canbench](https://docs.internetcomputer.org/references/execution-errors/#out-of-memory); shard or move data to stable memory — **do not change actor persistence shape** |
| **Wasm memory limit exceeded** — heap over `wasm_memory_limit` | **Message execution** | We do **not** set `wasm_memory_limit` on the backend canister; default IC limits apply | Migrate heap → stable memory; shard; only raise `wasm_memory_limit` if usage is expected **and** upgrade path stays safe — **never** as a substitute for IC0503 fixes |
| **Reserved pages for old Motoko** | **Message execution** | **Not applicable** — toolchain `moc = "1.8.2"` (Motoko ≫ 0.6.21) | Upgrade icp-cli/moc if ever seen on ancient wasm; unrelated to IC0503 |
| **Missing upgrade option** — `wasm_memory_persistence` | **Upgrade** | Avoid unless deliberately changing persistence mode | Do **not** add `wasm_memory_persistence` options while live canisters are `actor` + `--default-persistent-actors` |

**Key distinction:** IC0503 is an **upgrade-time Motoko RTS layout mismatch** between installed wasm and candidate wasm. Runtime “out of memory” is **heap/subnet capacity during a call**. Different causes, different fixes.

## What IC0503 is (recap)

Live BAMM backend canisters were deployed as:

```motoko
(with migration = EntitlementMigration.migration)
actor BAMM { ... }
```

with Motoko compiled using **`--default-persistent-actors`** from repo-root `mops.toml`.

Regressions that re-trigger IC0503:

1. Declaring **`persistent actor BAMM`** (explicit enhanced persistence layout ≠ deployed layout).
2. Building from `src/backend/` cwd **without** repo-root `mops.toml` args (wasm missing `--default-persistent-actors`).
3. Importing tags **`v133.0.0` / `v133.0.1`** (contained `persistent actor`).

## What IC0503 is **not**

Per [ICP docs — Out of memory](https://docs.internetcomputer.org/references/execution-errors/#out-of-memory):

> The canister tried to request more memory than the system can provide **during execution**.

That message does **not** mean “upgrade layout incompatible.” Topping up cycles, sharding data, or raising `wasm_memory_limit` **does not fix IC0503**.

Per [ICP docs — Wasm memory limit exceeded](https://docs.internetcomputer.org/references/execution-errors/#wasm-memory-limit-exceeded):

> The canister tried to grow its Wasm heap memory beyond the limit set by its **`wasm_memory_limit`** setting.

BAMM has not configured a custom `wasm_memory_limit`. If this error appears in the future, treat it as **runtime heap pressure**, not upgrade incompatibility.

Per [ICP docs — Reserved pages for old Motoko](https://docs.internetcomputer.org/references/execution-errors/#reserved-pages-for-old-motoko):

> This issue only occurs for Motoko versions **0.6.20 and older**.

Our pinned compiler (`mops.toml` → `moc = "1.8.2"`) is far newer. This error should not appear on current builds.

## Implementation safeguards (must not regress)

These repo controls exist specifically so memory-related “fixes” do not break the IC0503 recovery path:

| Control | Location | Blocks |
|---------|----------|--------|
| Actor shape preflight | `scripts/validate-backend-preflight.mjs` | `persistent actor BAMM`; missing migration wrapper; missing `--default-persistent-actors` |
| Repo-root mops build | `scripts/caffeine-backend-build.sh` + `src/backend/caffeine.toml` | Caffeine cwd building wasm without persistence flags |
| check-stable baseline | `scripts/check-stable/backend-02c10d9.most` | Silent stable-layout drift (M0170 / migration surprises) |
| Source SSOT | `src/backend/main.mo` lines 55–56 | `(with migration = …) actor BAMM` only |
| Toolchain pin | `mops.toml` `[toolchain] moc = "1.8.2"` | Old Motoko reserved-page behavior |

**Forbidden “memory fixes” (they worsen or mask IC0503):**

- Switching to `persistent actor BAMM` “for more memory” or “modern persistence.”
- Removing `--default-persistent-actors` from `[moc] args`.
- Building backend with bare `mops build` from `src/backend/` (bypasses repo-root args).
- Adding `wasm_memory_persistence` upgrade options without a coordinated canister reinstall and DDR.
- Importing **`v133.0.0` / `v133.0.1`** tags.

**Safe paths if true runtime OOM appears later:**

- Paginate large admin queries; avoid loading full purchase/entitlement maps in one message.
- Move cold data to stable memory / regions with explicit migration (new DDR required).
- Shard high-volume data to a second canister.
- Profile with canbench before changing canister settings.

Any stable-memory or persistence-mode change requires a **new migration + check-stable baseline** and must be evaluated against [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md) — not applied ad hoc.

## Operator triage

```
Upgrade failed during Caffeine import?
├─ Log says "Memory-incompatible program upgrade" / IC0503
│  ├─ Tag < v133.0.11 or missing sibling mops.toml flags → DDR-026 / import v133.0.11+
│  └─ Tag OK + draft canister ucnbj-… → redeploy_draft then build only (DDR-027)
│     (NOT "add migration"; NOT wipe production PEM/installers)
├─ Log says "Canister cannot grow its memory usage"
│  └─ Runtime OOM (this DDR) — status + canbench; NOT actor-shape change
├─ Log says "Wasm memory limit exceeded"
│  └─ Runtime heap cap (this DDR) — stable migration or limit review
└─ Log says "Reserved pages for old Motoko"
   └─ Rebuild with moc ≥ 0.6.21 (we use 1.8.2) — unrelated to IC0503
```

**Stored artifacts** (private.pem, installers, API codes) are durable state. They do **not** cause IC0503. They are why **production** reinstall is forbidden when clearing a **draft** IC0503.

## Verification

Before every tag / Caffeine import (unchanged from DDR-018):

```bash
node scripts/validate-backend-preflight.mjs
npx -y ic-mops@latest build   # passes check-stable
```

Preflight success line references this DDR so operators know IC0503 ≠ runtime OOM.

## Consequences

- Memory investigations must start with **error message classification**, not keyword “memory.”
- Runtime heap optimizations are allowed but must not alter the **actor persistence contract** established in DDR-017 without a deliberate migration program.
- Future `wasm_memory_limit` or stable-memory work gets its own DDR and check-stable update.
