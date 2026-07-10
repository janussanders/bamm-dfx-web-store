# DDR-008: LicenseSigner — use mo:core/List (Buffer removed in core 2.5.0)

**Date:** 2026-06-18  
**Status:** Implemented  
**Release:** `v118.0.1` (Buffer→List), `v118.0.2`–`v118.0.3` (Motoko API fixes), **`v119.0.0`–`v119.0.1`** (Caffeine import tags)

## Problem

Caffeine import/build failed with:

```
Import error [M0009]: .mops/core@2.5.0/src/Buffer/lib.mo does not exist
File: src/backend/LicenseSigner.mo
```

`LicenseSigner.mo` imported `mo:core/Buffer`, but **Buffer is not part of `mo:core`** (removed in the base→core migration). The module never existed in `core@2.5.0`; a partial `.mops` cache or prior build masking masked this intermittently.

## Decision

Replace `Buffer` usage with **`mo:core/List`** in `LicenseSigner.mo` (PKCS#1 encoding and base64 decode byte accumulation).

Run **`mops install`** before `mops build` / `mops check` in `src/backend/caffeine.toml` so Caffeine always populates `.mops/` on import (`.mops/` is gitignored).

## Verification

- `mops install && mops build` from repo root
- Caffeine import from tag **`v119.0.1`**, wait ~60s, publish, verify live site

## mo:core 2.5.0 API notes (v118.0.2+)

- No `mo:core/Buffer` — use `mo:core/List`
- No `Text.trimDefault` — use `#predicate` trim on `Text`
- No `Iter.range` — use `while` loops
- No `Nat.powMod` in core or base 0.16 — implement `modPow` locally (exponentiation by squaring)
- `sha2@0.1.14` has `Digest` class and `fromArray()`, not `new()` — hash bytes via `Digest.writeBlob(Text.encodeUtf8(...))` + `Iter.toArray(digest.sum().values())` (not `writeArray` on a core `Blob`; not cross-package `Blob.toArray`)

## mops.lock (required with dependency changes)

Adding `sha2 = "0.1.14"` to `[dependencies]` requires regenerating and committing `mops.lock` (`mopsTomlDepsHash` + package hashes). See [DDR-010](DDR-010-Mops-Lock-Deps-Hash-Mismatch.md). Without an updated lock, Caffeine import fails with **Dependency Lock File Hash Mismatch**.

## Caffeine build fix (2026-07-06)

`Text.encodeUtf8()` returns a **core `Blob`**. Passing it to `Sha256.Digest.writeArray` fails with **M0096** (`Blob` vs `[Nat8]`). Use **`digest.writeBlob(payloadJson.encodeUtf8())`** instead. Nat subtraction warnings in `natToFixedBytes`, `readDerLength`, and `pkcs1V15EncodeSha256` use `Nat.sub` where guards already ensure non-negative results.

## Signature endianness fix (2026-07-06)

`natToFixedBytes` previously emitted **little-endian** RSA signature bytes. Node.js `crypto.verify` and the BAMM desktop backend expect **big-endian** PKCS#1 signatures. Licenses signed on-canister failed desktop verification with `401 Invalid license signature` even when the correct `private.pem` was uploaded. Fixed by reversing fixed-width signature bytes before base64 encoding.
