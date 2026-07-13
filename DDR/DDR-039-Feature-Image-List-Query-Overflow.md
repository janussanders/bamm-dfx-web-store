# DDR-039: Feature image list query overflow (false “lost” features)

**Date:** 2026-07-13  
**Status:** Implemented  
**Parent:** [DDR-037](DDR-037-Free-Features-Marketing-Images.md), [DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md)  
**Related:** [DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md)

## Symptom

After uploading Free Feature (or Premium) marketing images and refreshing Admin → Features Management, the UI shows empty tables and prompts to **re-initialize** all features. Operators interpret this as a persistence wipe.

## Root cause (not EOP data loss)

1. `LicenseFeature.image` blobs are stored on the Motoko heap (persistent). Uploads via `uploadFeatureImage` succeed (ingress ≤ ~2 MiB per call).
2. Admin/landing **list** queries (`getLicenseFeatures`, `getPremiumFeatures`, `getCoreFeatures`) returned **every feature including full image bytes**.
3. IC **query responses are capped ~3 MiB**. Several screenshots push the combined candid payload over the limit → the query fails → React Query has no data → UI renders “No features” / Initialize buttons.
4. A mount `useEffect` auto-called `initializeDefaultPremiumFeatures` whenever `licenseFeatures.length === 0`. That Motoko helper **overwrote** default premium rows with `image = null`, which **can wipe premium images** if a transient empty result ever reached the effect. Free rows were not deleted by that helper, but looked “gone” when the list query failed.

Data is usually still on the canister; the **read path** broke.

## Decision

1. **Strip images from all feature list queries**; add `getFeatureImage(featureId) : async ?Blob` for on-demand thumbnails / Learn More / Premium cards.
2. **Remove Admin auto-initialize** on empty list; Initialize is explicit only.
3. Make premium + core initialize helpers **idempotent** (skip existing ids — never clobber images).
4. **Compress** uploads in the browser (max edge ~1280, JPEG, target ≤ ~450 KiB) before `uploadFeatureImage`.
5. If list query errors, show a clear error + optional recovery (remove known feature images to shrink payload) until Motoko strip ships.

## Motoko deploy note

`getFeatureImage` + list stripping require a **backend** upgrade. If IC0503 blocks it ([DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md)), ship frontend compression / no auto-init / error UI first; list stripping lands when backend upgrade or operator reinstall succeeds.

## Consequence

Features Management and Learn More stay readable as image count grows. Re-initialize no longer fires on refresh after uploads.
