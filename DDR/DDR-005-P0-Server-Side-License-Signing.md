# DDR-005: P0 Server-Side License Signing (SEC-001 Remediation)

**Date:** 2026-06-18  
**Status:** Implemented  
**Priority:** P0 (blocking)  
**Related:** DDR-002, DDR-003, DDR-004; BAMM `2026-06-18-legal-security-financial-liability-framework.md`

## Problem

`getPrivateKeyForSigning()` was a **public query** that returned the RSA `private.pem` blob to any caller. Trial and paid checkout pages fetched this key and signed licenses in the browser via SubtleCrypto. Any attacker could exfiltrate the key and forge unlimited premium licenses.

## Decision

1. **Remove** public and admin-query private key export (`getPrivateKeyForSigning`, `getPrivateKeyFile`).
2. **Store** PEM text on-canister via admin-only `uploadPrivateKeyPem` (never returned by any query).
3. **Sign** all trial and paid licenses in the canister using `LicenseSigner.mo` (RSASSA-PKCS1-v1_5 + SHA-256).
4. **Expose** only high-level issuance endpoints:
   - `issueTrialLicenseAndEmail(name, email)`
   - `fulfillPaidLicense(sessionId)`
5. **Reject** deprecated client-signing endpoints (`sendTrialLicenseEmail`, `sendSignedTrialLicenseEmail`).
6. **Rate-limit** public `submitUser` (per-email cooldown + hourly cap).
7. **Restrict** `getTransactionLogs` to admins (PII exposure).

## Deployment checklist (ops — P0.2)

After deploying this canister upgrade:

1. Generate a **new** RSA-2048 key pair (`scripts/generate-keypair.js` in BAMM repo).
2. Deploy updated `public.pem` to BAMM desktop builds (frontend + backend bundle).
3. Admin: call `uploadPrivateKeyPem` with the **new** `private.pem` on the IC canister.
4. **Revoke** the compromised key — treat all licenses signed with the old key as untrusted for new activations.
5. Email active customers with re-issued licenses if purchases occurred after public canister exposure.
6. Verify: trial download + paid checkout complete without browser network calls to a private-key endpoint.

## Out of scope (follow-up)

- **P0.5 hardware-bound activation** — BAMM desktop (`docs/ddr/licensing/2026-04-28-hardware-bound-license-refactor.md`).
- **P0.3 legal counsel** — entity/ToS review (non-engineering).
