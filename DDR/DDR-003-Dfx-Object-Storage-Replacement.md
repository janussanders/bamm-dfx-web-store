# DDR-003: Object storage replacement (dfx blocker)

**Date:** 2026-07-10  
**Status:** Approved (design) — **spike required before feature work**  
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

## Spike exit criteria

1. Backend builds under dfx **without** `caffeineai-object-storage`  
2. Local deploy; Super Admin claim works  
3. Upload ≥1 MiB test blob; browser download works  
4. Document max installer size  

If A/B/C all fail → pause storefront path and revisit hosting options (DDR-001 alternatives).

## Consequence

Installer upload UX may differ slightly from Caffeine; product behavior (sell licenses, activate entitlements) stays equivalent.
