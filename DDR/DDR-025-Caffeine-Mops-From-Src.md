# DDR-025: Caffeine mops must run from `src/` (IC0503 + no sibling scripts)

**Date:** 2026-07-08  
**Status:** Superseded by [DDR-026](DDR-026-Caffeine-Sibling-Mops-Toml.md)  
**Amends:** [DDR-024](DDR-024-Caffeine-Inline-Platform-Build.md), [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md) §4  
**Related:** [DDR-019](DDR-019-IC-Memory-Errors-vs-IC0503.md), [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md)

## Problem

**v133.0.9** imported successfully (no MODULE_NOT_FOUND) but backend **upgrade** failed:

```
IC0503 — RTS error: Memory-incompatible program upgrade
Canister: ucnbj-nqaaa-aaaab-aajua-cai
```

This is the **same canister and root cause** documented in [DDR-017 §4](DDR-017-IC0503-Memory-Incompatible-Upgrade.md):

> `src/backend/caffeine.toml` ran `mops install` / `mops build` with Caffeine cwd `src/backend/`. Repo-root / `src/mops.toml` `[moc] args` include **`--default-persistent-actors`**; builds from the wrong cwd emit wasm without enhanced orthogonal persistence → upgrade traps **IC0503**.

DDR-024 restored bare `mops install` / `mops build` to avoid sibling-script MODULE_NOT_FOUND. That fixed the **build init** failure and re-broke the **upgrade layout** contract.

| Constraint | Source | Requirement |
|------------|--------|-------------|
| No sibling `.mjs`/`.sh` | DDR-024 / v133.0.8 | Motoko sandbox does not materialize them |
| No repo-root `scripts/` | DDR-022 | Not on Caffeine VM |
| mops must see `--default-persistent-actors` | DDR-017 / DDR-019 | Else IC0503 vs live `actor` + flag wasm |
| Actor shape | DDR-017 | `(with migration = …) actor BAMM` only |

## Decision

### Backend commands — inline `cd ..` only (no script files)

```toml
[build]
commands = [
  "bash -c 'cd .. && mops install'",
  "bash -c 'cd .. && mops build'",
  "bash -c 'cd .. && pnpm bindgen'",
]
```

- Caffeine cwd remains `src/backend/`
- `cd ..` → `src/` where `src/mops.toml` + `src/mops.lock` + check-stable live
- Uses only platform `bash` / `mops` / `pnpm` — **no** `node …preflight.mjs`, **no** `caffeine-mops.sh`

### Local preflight (unchanged)

```bash
node scripts/validate-backend-preflight.mjs
npx -y ic-mops@latest build   # repo root — same [moc] args
```

### Draft canister recovery

If IC0503 **persists** on `ucnbj-…` after importing a tag with this fix, the draft canister may already hold incompatible intermediate wasm. Per DDR-017: **reinstall the draft backend canister** (data loss on draft only), then rebuild/upgrade from **`v133.0.10`**.

Do **not** switch to `persistent actor` or remove `--default-persistent-actors` (DDR-019 forbidden list).

## Import tag

**`v133.0.10`** — failed: `mops.toml` not found (`cd ..` leaves Motoko sandbox). Superseded by **`v133.0.11`** ([DDR-026](DDR-026-Caffeine-Sibling-Mops-Toml.md)): sibling `src/backend/mops.toml` + bare `mops`.

## Agent rules

- **Do not** revert to bare `mops install` / `mops build` without sibling `mops.toml` flags
- **Do not** use `cd ..` for mops on Caffeine (parent not in sandbox — this DDR failed)
- **Do not** reintroduce sibling preflight scripts into `caffeine.toml`
- **Do not** treat IC0503 as runtime OOM (DDR-019)

## Verification

```bash
node scripts/validate-caffeine-config.mjs
# must require: bash -c 'cd .. && mops install|build'
grep -n 'default-persistent-actors' src/mops.toml
```
