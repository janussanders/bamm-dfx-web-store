# DDR-037: Free Features marketing images (homepage Learn More)

**Date:** 2026-07-13  
**Status:** Implemented  
**Parent:** [DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md) (inline feature image blobs)  
**Related:** Features Management admin tab; Landing Page BAMM Basic accordion

## Context

Premium Features already support admin image upload via `uploadFeatureImage` / `LicenseFeature.image`. The homepage **BAMM Basic → Learn More** accordion (Dashboard, Bill Files, Income and Bill Tracking) was static copy only — no marketing screenshots.

## Decision

1. Reuse the existing `LicenseFeature` record with `isPremium = false` / `featureType = "Core"` for free marketing categories (stable ids: `dashboard`, `bill_files`, `income_tracking`).
2. Add **Free Features** section under Features Management (separate from Premium table) with the same upload/remove image actions.
3. Seed via `initializeDefaultCoreFeatures()` (idempotent; does not overwrite existing images).
4. Landing page loads `getCoreFeatures()` and renders each category image **after** the intro paragraph and **before** the bullet list.
5. Protect core ids from `migrateFeatureNamesInternal` deletes that previously removed legacy `"Dashboard"` / `"Bill Files"` name collisions.
6. Skip `licenseReferenceName` backfill for non-premium features so free marketing rows stay out of license name matching.

## Non-goals

- Moving accordion copy into canister fields (still `marketing.ts`).
- Separate Motoko map or chunked storage for free images.
- Changing Premium image UX beyond splitting the Features tab tables.

## Consequence

Admins initialize Free Features once, upload three images, and the homepage Learn More accordion shows them without a frontend redeploy of static assets.

## Deploy note (DDR-038)

`initializeDefaultCoreFeatures` may be missing on the live Motoko canister until a backend upgrade succeeds. Admin **Initialize Default Free Features** falls back to existing `addLicenseFeature` for ids `dashboard` / `bill_files` / `income_tracking` so Free Features image upload works without a Motoko deploy.
