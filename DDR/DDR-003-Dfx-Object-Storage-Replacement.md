# DDR-003: Object storage replacement (dfx blocker)

**Date:** 2026-07-10  
**Status:** Implemented  
**Parent:** [DDR-001](DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md)  
**Follow-ons:** [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md) (chunked upload lock), [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md) (where to append store fields)

## Problem

Caffeine installer/image uploads use `mo:caffeineai-object-storage` + `blob.caffeine.ai` and Motoko primitives that **do not exist on stock dfx** (`Prim.isStorageBlobLive`, dead-blob prune, cashier env vars).

Exact Caffeine storage clone on dfx is **impossible**. Everything else (II, Stripe outcalls, entitlements, RBAC) is portable with thin adapters.

## Decision

Remove Caffeine object-storage mixin from the dfx codebase and replace with:

| Priority | Option | Summary |
|----------|--------|---------|
| **A (preferred)** | Chunked blobs in backend canister | Admin uploads chunks; download via canister or asset file |
| **B** | Asset canister file store | Backend keeps metadata; files live on asset canister |
| **C** | External HTTPS (S3/R2) | Only if A/B fail size limits |

## Spike implementation (Option A lite — 2026-07-10)

Done in this repo (does **not** touch Caffeine production):

1. **Backend** (`src/backend/main.mo`): removed `Storage` / `MixinObjectStorage` imports and `include MixinObjectStorage()`; every former `Storage.ExternalBlob` is Motoko `Blob` (`mo:core/Blob`). Upload/download APIs keep working with single-blob args/returns (not chunked yet). `uploadPrivateKeyFile` remains trap/deprecated.
2. **mops**: removed `caffeineai-object-storage = "0.1.2"` from root, `src/mops.toml`, and `src/backend/mops.toml`; regenerated locks via `ic-mops install`.
3. **check-stable**: regenerated `scripts/check-stable/backend-02c10d9.most` (+ sibling copies) from the Blob-only `backend.most` after mixin removal. Empty dfx canisters do not need the old Caffeine mixin baseline.
4. **Frontend**: local shim `src/frontend/src/lib/dfxExternalBlob.ts` (`fromBytes` / `getBytes` / `getDirectURL` / `directURL`); after `caffeine-bindgen`, `backend.ts` is patched to import the shim and use identity upload/download. Bindgen now emits plain `Uint8Array` for file fields (no Caffeine ExternalBlob candid type). UI hooks bridge ExternalBlob ↔ bytes. Package removed from `src/frontend/package.json` (may remain transitive via bindgen/core-infra).

## Chunked installers + persistence (2026-07-10)

Desktop installers are ~110–140 MiB. IC ingress is **2 MiB** and query responses **3 MiB**, so single-shot `uploadMacInstaller(file)` always failed after the UI progress bar jumped to 100% (local `getBytes()` only).

| Piece | Behavior |
|-------|----------|
| Storage | `macInstallerStore` / `windowsInstallerStore` — persistent `[Blob]` chunks under `--default-persistent-actors` (survive upgrades) |
| Upload | `begin*Upload` → `upload*Chunk` (≤1.5 MiB) → `finalize*Upload` |
| Download | `getPublic*Meta` + `download*Chunk`; frontend reassembles |
| Legacy fields | `macInstallerFile` / `windowsInstallerFile` kept for upgrade compatibility (unused for new uploads) |
| Secrets | `stripeConfig`, `resendConfig`, `privateKeyPem`, admin RBAC maps — already persistent actor vars |

Frontend helper: `src/frontend/src/lib/chunkedInstaller.ts`.

### Still open

- Document cycle cost / memory for ~250 MiB of installers on the backend canister
- Optional later: move binaries to asset canister (Option B) if heap/cycles become painful

## Spike exit criteria

1. Backend builds under dfx **without** `caffeineai-object-storage` ✅
2. Local/IC deploy; Super Admin claim works ✅
3. Upload ≥1 MiB (and production-size DMG/EXE via chunks); browser download works — **shipped chunked path; verify on live after deploy**
4. Document max installer size — practical limit is canister memory/cycles; per-message chunk max **1.5 MiB**

## Consequence

Installer upload UX shows real per-chunk progress (minutes for ~100 MiB). Product behavior (sell licenses, activate entitlements) stays equivalent. Artifacts (installers + Stripe/RESEND/PEM/admins) persist across Motoko upgrades when using `dfx deploy` upgrade (not reinstall).
