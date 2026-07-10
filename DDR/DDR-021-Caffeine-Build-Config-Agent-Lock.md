# DDR-021: Caffeine build configuration — agent lock (do not modify)

**Date:** 2026-07-08  
**Status:** Approved (build paths: [DDR-026](DDR-026-Caffeine-Sibling-Mops-Toml.md); agent workflow: [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md))  
**Related:** [DDR-012](DDR-012-Caffeine-Import-Preflight-Gates.md), [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md), [DDR-018](DDR-018-Caffeine-Import-Runbook.md), [DDR-026](DDR-026-Caffeine-Sibling-Mops-Toml.md), [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md)

## Purpose

Online agents (Caffeine draft composer, platform agents, Cursor) repeatedly **“fixed”** import/upgrade failures by editing build configuration or inventing migrations. This DDR locks **what agents must not change**. Workflow (import / reinstall / build-only) is [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md).

**Read this DDR before editing any `caffeine.toml`, workspace include, or `src/backend/mops.toml`.**

## Incident history (why this exists)

| Tag | Agent / change | Result |
|-----|----------------|--------|
| v133.0.4–0.8 | Script path chase (`scripts/`, sibling `.mjs`) | MODULE_NOT_FOUND |
| v133.0.9 | Bare `mops` without sibling flags | IC0503 |
| v133.0.10 | `cd .. && mops` | `mops.toml` not found (parent outside sandbox) |
| v133.0.11 | Sibling `mops.toml` + bare mops | Build OK; draft IC0503 until **reinstall** |
| Agents | “Add entitlementId migration” / “revert to Version 132” | Wrong — migration exists; draft needs `redeploy_draft` |

## Locked configuration (SSOT — DDR-026)

### Files agents must NOT modify without a new DDR + human approval

| File | Role |
|------|------|
| `caffeine.toml` | Workspace `include = ["src/**"]` only |
| `src/backend/caffeine.toml` | Bare `mops install` / `mops build` / `pnpm bindgen` |
| `src/backend/mops.toml` | Must keep `--default-persistent-actors` |
| `src/backend/mops.lock` | Synced from repo-root lock |
| `src/frontend/caffeine.toml` | Must keep `rm -rf dist` |
| `src/frontend/package.json` | `vite build` only (no Caffeine preflight script) |
| `src/backend/main.mo` actor header | `(with migration = …) actor BAMM` only |
| `src/backend/EntitlementMigration.mo` | Legacy → `entitlementId` bridge |

### Canonical backend `[build]` commands (exact)

```
mops install
mops build
pnpm bindgen
```

### Canonical root `[workspace] include`

```toml
include = ["src/**"]
```

### Forbidden patterns (do not introduce)

| Pattern | Why |
|---------|-----|
| `cd ..` for mops | Parent outside Motoko sandbox (v133.0.10) |
| Sibling preflight `.mjs` / `.sh` in caffeine.toml | Not materialized (v133.0.8) |
| `scripts/` / `../scripts/` / `../../scripts/` in caffeine.toml | Not on Caffeine Motoko path |
| Removing `--default-persistent-actors` | IC0503 (DDR-017) |
| `persistent actor BAMM` | IC0503 (DDR-017) |
| Removing `rm -rf dist` from frontend `[build]` | Stale assets (DDR-009) |
| “Fix” IC0503 by editing migration when tag already has it | Use `redeploy_draft` (DDR-027) |

## Agent rules

### Allowed

- Build / deploy to **draft** per caffeine.toml
- Report failures with log excerpts; cite DDR-018 / DDR-027
- Request operator: GitHub import, or `redeploy_draft` for `ucnbj-nqaaa-aaaab-aajua-cai`
- Run local `node scripts/validate-caffeine-config.mjs` (read-only guard)

### Forbidden (unless human + new DDR)

- GitHub import from chat (UI-only — DDR-027)
- Editing locked files above to “fix” import/upgrade
- Reinstalling **production** canisters for draft IC0503
- Claiming entitlement migration is missing on `v133.0.11+`
- Reverting workspace to Caffeine “Version 132” as a code fix

## Automated guard

```bash
node scripts/validate-caffeine-config.mjs
```

## Caffeine draft agent prompt (safe)

See [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md) — build-only prompt after import / reinstall.

## Current import tag

**`v133.0.11`** — [DDR-018](DDR-018-Caffeine-Import-Runbook.md), [DDR-026](DDR-026-Caffeine-Sibling-Mops-Toml.md).
