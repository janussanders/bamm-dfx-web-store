# DDR-018: Caffeine import & build runbook (consolidated)

**Date:** 2026-07-08  
**Status:** Approved  
**Related:** [DDR-009](DDR-009-Caffeine-Stale-Deploy-Cache.md), [DDR-012](DDR-012-Caffeine-Import-Preflight-Gates.md), [DDR-015](DDR-015-Caffeine-Version-Tag-Alignment.md), [DDR-016](DDR-016-PremiumPurchase-M0170-Check-Stable-Baseline.md), [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md), [DDR-019](DDR-019-IC-Memory-Errors-vs-IC0503.md), [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md), [DDR-026](DDR-026-Caffeine-Sibling-Mops-Toml.md), [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md)

## Purpose

Single operator checklist before every Caffeine deploy. Prevents late failures from stale cache, wrong git ref, check-stable mismatch, IC0503 on poisoned draft canisters, and agent role confusion.

**Agentic workspace SSOT:** [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md).

## Before tagging / import (local preflight)

Run from repo root on the commit you will tag:

```bash
node scripts/sync-caffeine-src-toolchain.mjs
pnpm validate:caffeine-config
pnpm validate:mops-lock
node scripts/validate-backend-preflight.mjs
node scripts/validate-frontend-preflight.mjs
npx -y ic-mops@latest install
npx -y ic-mops@latest build    # check-stable vs scripts/check-stable/backend-02c10d9.most
cd src/frontend && rm -rf dist && pnpm build
```

**Must pass** before `git tag` + push. Agents: do not change config to pass — see [DDR-021](DDR-021-Caffeine-Build-Config-Agent-Lock.md).

## Git tag workflow (DDR-015)

Preferred helper (preflight + release notes with Caffeine paste blocks + optional tag/publish):

```bash
pnpm release:caffeine -- v133.0.x              # dry run
pnpm release:caffeine -- v133.0.x --publish    # tag + gh release (title = tag)
```

Manual:

1. Push commits to `main`
2. Tag: `git tag -a v133.0.x -m "…"` && `git push origin v133.0.x`
3. GitHub Release: `gh release create v133.0.x --title "v133.0.x" --notes "…"` — **title is version only**
4. Prefer importing the **tag** in Caffeine; blank git ref is OK only when `main` tip equals that tag tip

See [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md) for agent prompts embedded in the helper output.

| Tag train | When |
|-----------|------|
| `v133.x.y` | Caffeine generation **133** (current) |
| `v134.x.y` | When Caffeine reports generation **134** |

**Do not** use `v119.x` for new imports. Caffeine “Version 132” is a **platform generation label**, not a git tag in this repo.

## Caffeine deploy (three phases)

Draft/composer agents **cannot** GitHub-import. Platform may run `redeploy_draft` only after **operator confirmation**.

### Phase 1 — Operator: manual GitHub import

| Step | Action |
|------|--------|
| 1 | Local preflight + push/tag |
| 2 | Caffeine → **GitHub Settings** → repo `janussanders/bamm-e-commerce-site` |
| 3 | Git ref: **tag** (preferred) or **blank** if `main` == tag tip |
| 4 | **Import from GitHub** → wait ~60s |

### Phase 2 — Operator confirms: draft reinstall (when IC0503 / poisoned draft)

| Field | Value |
|-------|--------|
| Action | `redeploy_draft` (reinstall draft backend + draft frontend) |
| Draft backend ID | **`ucnbj-nqaaa-aaaab-aajua-cai`** |
| Effect | Clears draft stable state; sidesteps IC0503 |
| Does **not** | Touch production / live canisters |

Skip Phase 2 only if draft has never hit IC0503 and upgrades cleanly.

### Phase 3 — Agent: build only

```
Build only from the current workspace. Run backend and frontend builds per caffeine.toml.
Deploy to draft only.
Do not import from GitHub.
Do not edit caffeine.toml, mops.toml, migration, or actor shape.
Do not reinstall production.
If IC0503 occurs, stop and request redeploy_draft for ucnbj-nqaaa-aaaab-aajua-cai.
```

Then operator promotes draft → production when draft verifies (DDR-009).

## Failure recovery

| Error | Cause | Fix |
|-------|-------|-----|
| **IC0503** on draft `ucnbj-…` | Poisoned draft heap / prior bad wasm | **`redeploy_draft`**, then build only (DDR-027). Source on `v133.0.11+` already correct. |
| **IC0503** after reinstall | Wrong actor shape or missing `--default-persistent-actors` | Verify sibling `src/backend/mops.toml` (DDR-026); do not use `persistent actor` |
| **mops.toml not found** | `cd ..` left Motoko sandbox | DDR-026 — sibling mops.toml; no `cd ..` |
| **MODULE_NOT_FOUND** preflight/scripts | Sibling scripts not in sandbox | DDR-024/026 — no preflight in caffeine.toml |
| **M0170** premiumPurchases | Stale `.old/` or missing migration | Migration exists on `v133.0.11+`; pin check-stable; clear `.old/` |
| Agent: “add entitlementId migration” | Misdiagnosis | Refuse — migration already present; use reinstall |
| Agent: “revert to Version 132” | Platform generation ≠ git fix | Refuse — import `v133.0.11+` + reinstall draft if needed |
| Production stale assets | Draft-only / `.old/` | DDR-009 |
| Runtime OOM messages | Not IC0503 | DDR-019 — do not change actor persistence |

## Backend canister constraints (do not regress)

- **`actor BAMM`** with `(with migration = EntitlementMigration.migration)` — **not** `persistent actor BAMM`
- **check-stable:** `scripts/check-stable/backend-02c10d9.most` (+ sibling `src/backend/caffeine-check-stable.most`)
- **EntitlementMigration:** Legacy `PremiumPurchase` → `entitlementId = ""`
- **Caffeine mops:** sibling `src/backend/mops.toml` with `--default-persistent-actors`

## Production verification

| Check | Expected |
|-------|----------|
| Backend upgrade | No IC0503 / M0170 in Caffeine build log |
| `getEntitlementRegistry` | Responds on canister |
| Admin → Purchases → Entitlements | Tab loads |
| `bamm-gw3.caffeine.xyz` hero | Local-first desktop badge |
| Features | 7 tiles (incl. Trades) |
| `/terms` | Washington governing law (`copy.ts`) |
| dist hashes | ≠ `.old/` after build |

## Current release (2026-07-08)

**Import tag:** **`v133.0.14`** — DDR-026 sibling `mops.toml` + DDR-027/028/029.
