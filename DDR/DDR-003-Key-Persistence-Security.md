# DDR-003: API Key Persistence & Security Model

**Status:** Approved  
**Date:** 2026-06-01  
**Authors:** BAMM Engineering  

---

## Context

BAMM requires three critical secrets to function:

1. **Stripe Secret Key** (`sk_live_...`) — required for Stripe checkout session creation and post-payment verification
2. **RESEND API Key** — required for all email delivery (license delivery, admin invites)
3. **RSA Private Key** (`private.pem`) — required for RSA-SHA256 license signing

Early builds stored these as non-persistent variables in the canister. Every new deployment wiped them, causing checkout to silently fail and licenses to not be generated. Admins had to re-enter all keys after every build.

---

## Decision

### Storage Model

All three keys are stored in persistent canister state (enhanced orthogonal persistence on ICP). They survive canister upgrades and redeploys without any action from the admin.

### Admin Dashboard Indicators

The admin dashboard header displays live status indicators for all three keys:

| Key | Green (Configured) | Red (Missing) |
|---|---|---|
| Stripe | `sk_live_...` stored and non-empty | Empty or unset |
| RESEND | API key stored and non-empty | Empty or unset |
| RSA Private Key | `private.pem` uploaded and stored | Not uploaded |

**When any key is missing:**
- The checkout flow shows a clear "Checkout unavailable — Stripe not configured" error instead of a silent redirect failure
- License generation shows a clear "License generation unavailable — RSA key not configured" error
- Email delivery shows a clear "Email unavailable — RESEND not configured" error

### Key Entry (Admin Panel)

- Keys are entered once in the Features Management panel
- After saving, the Stripe key field shows masked dots (`••••••••`) with a green "Stripe Ready" badge
- The RSA private key is uploaded as a `private.pem` file; the field shows a green "Key Uploaded" indicator after upload
- Keys are never shown in plaintext in the UI after initial entry

---

## Security Analysis

### RSA Private Key at Rest (CWE-312)

**Risk:** The RSA private key is stored as plaintext in canister state. In theory, a malicious node operator with access to the ICP replica's memory could extract it.

**Mitigations in place:**
- ICP canisters run on subnets with multiple independent node operators; no single operator can access canister state unilaterally
- The private key is not exposed via any public query endpoint
- Access to the key requires an authenticated admin principal and an explicit key-retrieval endpoint (write-only by design — no read endpoint for the private key)

**Residual risk:** The key is in plaintext in canister heap. This is architecturally equivalent to storing a secret in an encrypted database where the encryption key is also stored — the isolation depends on the platform boundary, not cryptographic separation.

**Long-term mitigation:** IC vetKeys (currently in development) will provide threshold-decryption-based key management that eliminates this residual risk. Migration to vetKeys is planned when the feature reaches mainnet stability.

### Stripe Secret Key at Rest (CWE-312)

Same analysis as RSA private key. Additionally:
- The Stripe key is used only for outbound HTTP calls from the canister to Stripe's API
- No read endpoint for the Stripe key — write-only
- If the key is compromised, the blast radius is limited to the BAMM Stripe account (no user financial data stored in the canister)

### RESEND API Key at Rest (CWE-312)

Same analysis. If compromised, an attacker can send emails from the BAMM RESEND account. Monitor RESEND dashboard for unusual send volume.

### Test Key vs Live Key (CWE-345)

A persistent failure mode was using a Stripe test key (`sk_test_...`) while payments used the live Stripe environment. Test keys cannot verify live session IDs — Stripe returns 401 and the canister defaults to `status=unknown`. 

**Guard:** The admin dashboard should visually distinguish test keys from live keys. The Stripe key field label changes based on the prefix of the stored key. Admins are warned if a test key is stored while the app is deployed to a live environment.

---

## Key Rotation Procedure

1. Generate new key in the respective provider dashboard (Stripe, RESEND, RSA)
2. Enter the new key in the Features Management panel
3. Save — the new key is immediately active for all subsequent operations
4. Revoke the old key in the provider dashboard
5. Verify the status indicator turns green in the admin dashboard

No canister upgrade or deployment is required for key rotation.

---

## Alternatives Considered

**Browser session storage only:** Keys stored only in the admin browser session. Rejected — this was the original model and caused silent failures for every non-admin user who completed a payment, because the RSA key was not available during their session.

**Environment variables:** ICP canisters do not have environment variables in the traditional sense. Canister state is the equivalent mechanism.

**IC vetKeys:** The correct long-term solution but not yet stable on mainnet. Deferred.

---

## Consequences

**Positive:**
- Keys survive all future deployments without admin re-entry
- Clear status indicators eliminate silent failures
- Key rotation is a simple admin UI operation with no deployment required

**Negative:**
- Plaintext key storage in canister heap is an accepted risk pending vetKeys availability
- A compromised admin account can read and replace keys — admin account security is therefore critical

---

## References

- CWE-312 Cleartext Storage of Sensitive Information: https://cwe.mitre.org/data/definitions/312.html
- IC vetKeys: https://internetcomputer.org/docs/current/developer-docs/smart-contracts/encryption/vetkeys
- Stripe API key security: https://stripe.com/docs/keys#keeping-your-keys-safe
