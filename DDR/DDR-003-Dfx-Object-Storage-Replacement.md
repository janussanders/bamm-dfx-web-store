# DDR-003: Object storage replacement (dfx blocker)

**Date:** 2026-07-10  
**Status:** Implemented (spike)  
**Parent:** [DDR-001](DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md)

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

### Still open (full spike exit)

- Local deploy + Super Admin claim
- Upload ≥1 MiB test blob; browser download
- Document max installer size (IC message / query limits for single Blob)

## Spike exit criteria

1. Backend builds under dfx **without** `caffeineai-object-storage` ✅ (compile spike)
2. Local deploy; Super Admin claim works
3. Upload ≥1 MiB test blob; browser download works
4. Document max installer size

If A/B/C all fail → pause storefront path and revisit hosting options (DDR-001 alternatives).

## Consequence

Installer upload UX may differ slightly from Caffeine; product behavior (sell licenses, activate entitlements) stays equivalent. Large installers may need chunking (Option A full) before production-size DMG/EXE uploads succeed.
