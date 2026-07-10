# DDR-027: Caffeine agentic workspace — import / reinstall / build-only

**Date:** 2026-07-08  
**Status:** Approved  
**Related:** [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md), [DDR-018](DDR-018-Caffeine-Import-Runbook.md), [DDR-019](DDR-019-IC-Memory-Errors-vs-IC0503.md), [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md), [DDR-026](DDR-026-Caffeine-Sibling-Mops-Toml.md)

## Purpose

Lock the **human + agent** division of labor on Caffeine so we do not re-learn:

- Agents cannot GitHub-import from a chat prompt
- IC0503 on a poisoned **draft** canister is fixed by **reinstall**, not by more tags or “add entitlementId migration”
- Production durable state (PEM, installers, API codes) must not be wiped to clear draft IC0503

## Roles (hard split)

| Action | Who | How |
|--------|-----|-----|
| GitHub import | **Operator only** | Caffeine UI → GitHub Settings → **Import from GitHub** |
| Choose git ref | **Operator only** | Tag preferred; blank/`main` OK when `main` tip == release tag tip |
| `redeploy_draft` / reinstall draft canisters | **Operator confirms** → platform agent | Clears draft stable state; **does not touch production** |
| Compile + deploy to draft | Draft / composer agent | Build only per `caffeine.toml` |
| Promote draft → production | Operator / platform UI | Go Live / Push version update |
| Edit `caffeine.toml`, migration, actor shape | **Forbidden** for agents without new DDR | See DDR-021 / DDR-026 |

## Draft backend canister (IC0503 recovery)

| Field | Value |
|-------|--------|
| Draft backend canister ID | **`ucnbj-nqaaa-aaaab-aajua-cai`** |
| Symptom | IC0503 `Memory-incompatible program upgrade` on `install_code` |
| First response after correct tag is imported | **`redeploy_draft`** (reinstall draft backend + draft frontend) |
| Then | **Build only** — no import, no migration edits |
| Never | Reinstall **production** to clear draft IC0503 |

Draft reinstall **resets draft stable state** (draft PEM/installers/API codes lost). Production (`bamm-gw3`) is untouched until a successful promote.

Stored artifacts (private.pem, installers, access/API codes) are **not** the cause of IC0503 (DDR-019). They explain why production reinstall is forbidden.

## GitHub import (manual)

Caffeine **GitHub Settings** dialog:

1. Repository: `janussanders/bamm-e-commerce-site`
2. **Git ref (optional)** — branch, tag, or commit
3. **Import from GitHub**

| Ref choice | When |
|------------|------|
| **Tag** (e.g. `v133.0.11`) | Preferred after each release — reproducible |
| **Blank** | Allowed when `origin/main` == release tag tip (same commit). Historical “blank worked” = always got current `main`, not magic |
| Branch `main` | Same as blank if default branch is `main` |

Agents must **not** claim they imported a tag. If workspace is stale, tell the operator to open GitHub Settings and import.

## Entitlement migration (do not rediscover)

`EntitlementMigration.mo` + `(with migration = EntitlementMigration.migration) actor BAMM` is already on **`v133.0.11+`**.

| Wrong agent diagnosis | Correct |
|-----------------------|---------|
| “v133 blocked until entitlementId migration is added” | Migration **exists**; draft IC0503 → **reinstall draft** |
| “Revert to Version 132” | Caffeine generation label ≠ git tag; does not ship entitlements |
| “IC0503 = out of memory / too many blobs” | Upgrade layout mismatch (DDR-019) |

## Canonical agent prompts

### After operator imported + (if needed) confirmed `redeploy_draft`

```
Build only from the current workspace. Run backend and frontend builds per caffeine.toml.
Deploy to draft only.
Do not import from GitHub.
Do not edit caffeine.toml, mops.toml, migration, or actor shape.
Do not reinstall production.
If IC0503 occurs, stop and request redeploy_draft for draft backend ucnbj-nqaaa-aaaab-aajua-cai — do not change source.
```

### If IC0503 appears again on draft

```
Stop. Do not edit migration or caffeine.toml.
Request operator/platform: redeploy_draft (reinstall draft canisters only; canister ucnbj-nqaaa-aaaab-aajua-cai).
After reinstall completes, build only.
```

## Build parameters (locked — DDR-026)

Do not change without a new DDR:

```toml
# src/backend/caffeine.toml
commands = ["mops install", "mops build", "pnpm bindgen"]
```

Requires sibling `src/backend/mops.toml` with `--default-persistent-actors`.

```toml
# src/frontend/caffeine.toml
commands = ["rm -rf dist", "pnpm build"]
```

Root `caffeine.toml`: `include = ["src/**"]` only.

## Operator checklist (every deploy)

Preferred: use the release helper so prompts stay consistent:

```bash
# Dry run — preflight + write notes + print Caffeine paste blocks
pnpm release:caffeine -- v133.0.x

# Tag + GitHub release (title = tag only) + print prompts
pnpm release:caffeine -- v133.0.x --publish
```

Script: `scripts/caffeine-release.mjs` (DDR-015 title rules; embeds DDR-027 prompts).

Manual fallback:

1. Local preflight + tag (DDR-018)
2. Caffeine UI → Import (tag or blank if tip matches)
3. Wait ~60s
4. If last draft upgrade hit IC0503 → confirm **`redeploy_draft`**
5. Prompt agent: **build only** (prompt above)
6. Verify draft URL → promote → verify `bamm-gw3`

## What the helper does **not** automate

GitHub import, `redeploy_draft`, and production promote remain Caffeine UI / platform-agent steps (no API from this repo).

## Current release

**`v133.0.14`** — see DDR-018 / DDR-026 / DDR-028 / DDR-029.
