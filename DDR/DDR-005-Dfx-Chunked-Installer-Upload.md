# DDR-005: Chunked installer upload (IC message limits)

**Date:** 2026-07-10  
**Status:** Implemented  
**Parent:** [DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md)  
**Related:** [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md), [docs/dfx-deploy.md](../docs/dfx-deploy.md)

## Failure mode (observed)

Admin selected a ~110–137 MiB DMG/EXE. The upload progress bar jumped to **100% immediately**, then nothing was stored.

| Symptom | Root cause |
|---------|------------|
| Bar → 100% instantly | `ExternalBlob.getBytes()` / `withUploadProgress` only finished the **local** read; it was not IC transfer progress |
| Upload “succeeds” then missing file / trap | Single `uploadMacInstaller(file: Blob)` / `uploadWindowsInstaller` sends the whole file in one **ingress** message |
| IC limit | Max ingress payload **2 MiB**; query response **~3 MiB** |

Caffeine hid this behind `blob.caffeine.ai` object storage. Dfx has no that gateway (DDR-003).

## Decision

1. **Never** send production installers as a single candid `blob` update/query.
2. Use **chunked** APIs (≤ **1.5 MiB** per chunk — headroom under 2 MiB):

   | Phase | Mac | Windows |
   |-------|-----|---------|
   | Begin | `beginMacInstallerUpload` | `beginWindowsInstallerUpload` |
   | Chunk | `uploadMacInstallerChunk` | `uploadWindowsInstallerChunk` |
   | Commit | `finalizeMacInstallerUpload` | `finalizeWindowsInstallerUpload` |
   | Download | `getPublicMacInstallerMeta` + `downloadMacInstallerChunk` | same for Windows |

3. Persist committed installers in `macInstallerStore` / `windowsInstallerStore` (`chunks : [Blob]`) under `--default-persistent-actors`.
4. Frontend **must** drive progress from **chunk index / totalChunks** (`src/frontend/src/lib/chunkedInstaller.ts`), not from `getBytes()` alone.
5. Legacy single-shot `upload*Installer` may remain for tiny files only; it **traps** if `file.size() > installerChunkMaxBytes`.

## Agent / operator locks

- Do **not** “fix” upload UX by only wiring `withUploadProgress` without chunking.
- Do **not** reintroduce `@caffeineai/object-storage` / `MixinObjectStorage` on this repo.
- After `pnpm bindgen` / `caffeine-bindgen`, re-apply `dfxExternalBlob` + `identityUploadFile` / `identityDownloadFile` in `backend.ts` (DDR-003).
- Expect **minutes** per ~100 MiB installer on mainnet (many update calls).

## Verify

```bash
# Backend exposes chunk max
dfx canister call backend getInstallerChunkMaxBytes --network ic --identity anonymous --query
# → (1_500_000 : nat)

# After admin upload: public meta non-null
dfx canister call backend getPublicMacInstallerMeta --network ic --identity anonymous --query
```

Admin UI: progress advances in steps (not a single jump to 100%). Customer download reassembles via chunks.

## Consequence

Functional parity with Caffeine installer hosting without Caffeine storage. Heap/cycles cost scales with installer size (~250 MiB for Mac+Windows); revisit Option B (asset canister) in DDR-003 if that becomes painful.
