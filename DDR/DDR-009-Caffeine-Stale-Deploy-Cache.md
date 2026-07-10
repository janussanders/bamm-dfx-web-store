# DDR-009: Caffeine Stale Deploy Cache (`.old/` / production asset canister)

**Date:** 2026-06-18  
**Status:** Documented (operational)  
**Related:** [README — Deploy via Caffeine](../README.md#deploy-via-caffeine), [AGENTS.md](../AGENTS.md)

## Problem

Repeated deploys showed:

- **Workspace source** correct (e.g. tag `v119.0.1` / `v119.0.2`, verified in `src/`)
- **Draft preview** sometimes correct after rebuild
- **Production** (`bamm-gw3.caffeine.xyz`) still serving **v116-era frontend assets**
- Caffeine agent status: “Version N deployed to production” — **incorrect**

Root cause is **deployment pipeline**, not GitHub source:

1. **Stale `src/frontend/dist/`** — frontend build output was **never regenerated** after v119 import; hashed filenames (`index-Cs-UAD2i.js`, `index-Cjbz0ip-.css`) matched `.old/` backup byte-for-byte; **TermsPage / PrivacyPage / RefundPage chunks absent** from stale dist
2. **Draft vs production** — draft may use a different path/cache; production asset canister uploaded from stale dist
3. **Stale workspace cache** — Caffeine `.old/` directory holds prior build artifacts; agents reported inability to delete due to tool restrictions
4. **Internal `build` branch** — workspace HEAD on non-GitHub commit while import tag is newer
5. **`env.json`** — template placeholders (`"undefined"`) copied to dist by `pnpm copy:env`; Caffeine platform should inject canister IDs at deploy (undefined in workspace pre-deploy is expected; undefined on live site is a platform config issue)

## Evidence (2026-06-18)

| Layer | v119 source | v116 stale |
|-------|-------------|------------|
| GitHub tag `v119.0.1` | ✓ hero badge, 7 tiles, `copy.ts` Terms | — |
| Caffeine workspace `src/` | ✓ confirmed by multiple agents | — |
| `src/frontend/dist/` after build | ✓ new hashes, legal routes in bundle | ✗ **same hashes as `.old/`** — never rebuilt |
| Production URL | — | ✓ no badge, 6 tiles, legacy `/terms` template |
| Workspace git | — | `build` @ commits not in GitHub repo |

## Stale `dist/` (primary root cause)

- **`src/frontend/dist/`** is **gitignored** — not in GitHub; persists in Caffeine workspace between imports
- **`src/frontend/caffeine.toml`** runs `pnpm build` → `vite build && cp env.json dist/`
- If Caffeine **skips frontend build** or **cannot delete dist/**, production uploads **v116 hashed assets**
- **Verify after build:** dist `index-*.js` / `index-*.css` hashes must **change** from prior release; must **not** match `.old/` copies

**Repo mitigation (v119.0.3+):** frontend build command prefixed with `rm -rf dist` in `src/frontend/caffeine.toml`.

## `.old/` directory

- **Gitignored** (`.gitignore`) — not in GitHub; created in Caffeine workspace during builds
- **`mops.toml`** references `.old/src/backend/dist/backend.most` for `[canisters.backend.check-stable]` (upgrade compatibility check)
- Stale contents under `.old/` can interfere with deploy if pipeline reuses cached artifacts instead of fresh `dist/`

**Do not commit `.old/` to GitHub.**

## Deploy workflow (two phases)

**Phase 1 — Operator (Caffeine UI, manual):** GitHub import → select **git tag** → wait ~60s. The draft agent cannot do this.

**Phase 2 — Draft agent:** Build only (`caffeine.toml`). Prompt: `Build the project from the imported tag. Run backend and frontend builds per caffeine.toml.`

**Phase 3 — Operator / platform (when production stale):**

- Delete stale **`src/frontend/dist/`** and **`.old/`** before frontend build if hashes unchanged
- **Explicit asset upload** of fresh `dist/` to **production** asset canister
- **Promote/publish** draft → production on `bamm-gw3.caffeine.xyz`

Do not accept “deployed to production” until **production URL** matches draft. See [DDR-018](DDR-018-Caffeine-Import-Runbook.md).

## Remediation options (Caffeine)

When standard import + build fails to update production:

| Approach | Notes |
|----------|--------|
| **`commit_and_deploy_draft`** | Prefer when available — handles deploy pipeline end-to-end |
| **Platform team** | Clear `src/frontend/dist/` and `.old/` when agent lacks delete permissions |
| **Specialized cleanup agent** | Remove `.old/` and stale `dist/` before rebuild |
| **Forced clean rebuild + explicit production upload** | Manual composer instruction (see README template) |
| **Tag + commit in prompt** | Prevents importing wrong ref; verify workspace commit after import |
| **Post-build dist check** | Compare `dist/index-*.js` hash to `.old/` — must differ |

## Verification (production only)

| Check | Expected |
|-------|----------|
| `bamm-gw3.caffeine.xyz` hero | **Local-first desktop app** badge |
| Features That Matter | **7 tiles** (incl. Trades) |
| Footer | Terms · Privacy · Refunds |
| `/terms` | `copy.ts` content; §9 **Washington State** (not Delaware template) |
| Draft vs production | URLs match after successful promote |

## Consequences

- **Tags alone are insufficient** — must verify production URL after every deploy
- **Build success ≠ live deploy** — treat draft and production as separate canisters
- **Counsel/legal copy** in GitHub is irrelevant on site until production asset canister updates
