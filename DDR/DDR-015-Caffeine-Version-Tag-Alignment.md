# DDR-015: Caffeine version tag alignment (v133+)

**Date:** 2026-07-07  
**Status:** Approved  
**Supersedes:** v119.x examples in deploy docs (tags remain valid history; new tags use v133.x)  
**Related:** [DDR-009](DDR-009-Caffeine-Stale-Deploy-Cache.md), [DDR-012](DDR-012-Caffeine-Import-Preflight-Gates.md), [README — Deploy via Caffeine](../README.md#deploy-via-caffeine)

## Context

Caffeine workspace UI reports deployment generations as **Version N** (e.g. **Version 133**). GitHub import refs were documented as **`v119.x`** semver tags from an earlier release train. After many deploys and merges on `main` without new tags, production canister and asset canisters lagged while source on `main` included entitlement registry, activation API, and M0170 migration fixes.

Operators were prompted with **`v119.0.5`**, which does not match the Caffeine generation counter and confuses import/rebuild prompts.

## Decision

1. **New release tags** on `main` use **`v133.x.y`**, aligned with the current Caffeine deployment generation (**133**).
2. **Patch** (`y`) increments for each Caffeine import on the same generation (e.g. `v133.0.0` → `v133.0.1` for hotfixes).
3. When Caffeine’s reported generation advances (e.g. 134), the next tag train becomes **`v134.x.y`**.
4. **Historical tags** (`v117.x`–`v119.x`) stay on GitHub; do not retag or delete.
5. **Composer prompts** pass **git tag** to the operator for Caffeine UI import; the **draft agent** only builds after import (DDR-018).
6. **GitHub Release title** is the **tag only** (e.g. `v133.0.7`) — no descriptor suffix. Put change notes in the release body, not the title.

## GitHub Release naming

| Field | Format | Example |
|-------|--------|---------|
| **Git tag** | `v133.x.y` | `v133.0.7` |
| **Release title** | Same as tag — **version only** | `v133.0.7` |
| **Release body** | Summary, DDR refs, import steps | Markdown notes |
| **Tag annotation message** | Short commit-style summary (optional) | `fix(caffeine): src/ toolchain (DDR-022)` |

**Do not** use descriptive release titles such as `v133.0.7 — src/ Caffeine toolchain`. Operators and Caffeine import select by **tag string**; the title should match exactly.

```bash
gh release create v133.0.7 --title "v133.0.7" --notes "$(cat <<'EOF'
…release notes here…
EOF
)"
```

**Preferred:** `pnpm release:caffeine -- v133.0.x --publish` (`scripts/caffeine-release.mjs`) — runs preflight, writes notes that pin DDR-027/028 prompts, tags, and creates the release with **title = tag only**.
## Workflow

```bash
# On main after preflight (DDR-012)
pnpm validate:mops-lock
node scripts/validate-backend-preflight.mjs
node scripts/validate-frontend-preflight.mjs

git tag -a v133.0.7 -m "fix(caffeine): src/ toolchain (DDR-022)"
git push origin v133.0.7
gh release create v133.0.7 --title "v133.0.7" --notes "…"
```

**Operator (Caffeine UI):** GitHub import → `janussanders/bamm-e-commerce-site` → select tag → wait ~60s.

**Draft agent (after import / redeploy_draft):** see [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md) build-only prompt.

Production promote / asset upload: operator or platform (DDR-009) — not the draft agent.

## Current release (2026-07-08)

**Import tag:** **`v133.0.14`** — pins DDR-027/028/029 (agentic workflow, entitlement backfill, version visibility).

## Consequences

- README / AGENTS.md / DDR-009 examples updated to **`v133.x`**; avoid new `v119.x` tags.
- Entitlement deploy requires **canister upgrade** (migration) plus **production** frontend upload — tag alone is insufficient (DDR-009).
- Draft IC0503 after correct tag → **`redeploy_draft`** for `ucnbj-…`, not “add migration” or wipe production (DDR-027).
- BAMM desktop repo versioning (e.g. `28.x`) remains independent; only e-commerce Caffeine tags follow this scheme.
