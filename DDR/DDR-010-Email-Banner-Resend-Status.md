# DDR-010: Admin email banner uses RESEND status (not trial file)

**Date:** 2026-07-12  
**Status:** Implemented  
**Parent:** [DDR-008](DDR-008-Dfx-Primary-Caffeine-Backup.md)  
**File:** `src/frontend/src/pages/AdminPanel.tsx`

## Failure mode

Admin badge could show **✓ Email System Ready** (`getConfigurationStatus().resendConfigured`) while the yellow **Email System Configuration Required** banner still showed.

## Root cause

Banner gate was:

```ts
!!resendConfig && !!trialLicenseFile
```

- `resendConfig` is a record object (often present even when empty).  
- **Trial license file** is legacy; networked v2 licenses are signed with on-canister **PEM**, not a pre-uploaded trial blob.  
- Stripe/RESEND test success does not upload `trialLicenseFile`, so the banner stayed up (false negative).

## Decision

```ts
const isEmailSystemConfigured = !!configStatus?.resendConfigured;
```

Align banner with the same SSOT as the badge (`getConfigurationStatus`). Copy updated to point at RESEND test + PEM, not trial file upload.

## Verify

With RESEND saved and test OK: badge green, yellow banner **hidden**. Without API key: banner **shown**.
