# DDR-029: Storefront + desktop installer version visibility

**Date:** 2026-07-08  
**Status:** Approved  
**Related:** [DDR-015](DDR-015-Caffeine-Version-Tag-Alignment.md), [DDR-027](DDR-027-Caffeine-Agentic-Workspace-Workflow.md)

## Problem

Operators could not tell which **e-commerce git tag** was live on `bamm-gw3`, or which **desktop installer** (BAMM GitHub Release) was uploaded to Admin → Installers. The two version trains are independent and were invisible in the UI.

## Decision

### Two independent version trains

| Train | Source | Example | Shown where |
|-------|--------|---------|-------------|
| **Storefront** | Git tag at build (`v133.x.y`) | `v133.0.14` | Footer, Admin header |
| **Desktop installer** | Uploaded filename from BAMM GitHub Releases | `v30.3.7` from `BAMM-30.3.7-arm64.dmg` | Admin Installers, Download Success buttons |

Do **not** conflate storefront `v133.x` with desktop `v30.x` (DDR-015).

### Storefront stamp

- `scripts/write-storefront-version.mjs` writes `src/frontend/src/generated/storefrontVersion.ts`
- Frontend `pnpm build` / `pnpm dev` run the stamp first
- Never show git’s `-dirty` suffix in the footer; local uncommitted builds use `-local`; CI omits that suffix (mops/build often dirties the tree)
- `pnpm release:caffeine -- <tag>` stamps the release tag before publish

### Installer naming (required on upload)

| Platform | Pattern |
|----------|---------|
| macOS | `BAMM-{semver}-arm64.dmg` (optional `-UNSIGNED`) |
| Windows | `BAMM-{semver}.exe` |

Admin upload rejects non-matching names. Parse via `src/frontend/src/lib/versions.ts`.

### Public API

`getInstallerFileNames()` — returns mac/windows `fileName` only (no blob) so Download Success can show version labels without admin auth.

## Verification

```bash
node scripts/write-storefront-version.mjs v133.0.14
# Footer / Admin show Storefront v133.0.14
# Upload BAMM-30.3.7-arm64.dmg → Admin shows Desktop v30.3.7
```
