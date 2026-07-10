# DDR-006: Internet Identity OpenID Provider Integration

**Status:** Approved  
**Date:** 2026-06-01  
**Authors:** BAMM Engineering  
**Supersedes:** N/A  

---

## Context

The BAMM admin console currently uses Internet Identity (II) as its sole authentication mechanism. Administrators log in via a passkey (TouchID, FaceID, Windows Hello, hardware security key) presented through the II popup.

As of the April 2026 Internet Identity release, DFINITY added native support for three OpenID Connect (OIDC) providers within the II authentication flow:

- **Google** (`accounts.google.com`)
- **Apple** (`appleid.apple.com`)
- **Microsoft** (`login.microsoftonline.com`)

Administrators who rely on managed work accounts (Google Workspace, Microsoft 365, Apple Business) expressed a preference for signing in via their existing identity provider rather than maintaining a separate passkey. The account holder additionally explored whether the `www.bammservice.com` domain could be registered as a custom enterprise SSO provider with II.

---

## Decision

Add Google, Apple, and Microsoft OpenID sign-in options to the BAMM admin login flow by passing an `openIdProvider` hint to the Internet Identity `AuthClient` at sign-in time. No changes are made to the backend, role system, or principal-based authorization model.

Custom enterprise SSO via `www.bammservice.com` will **not** be implemented at this time (see Alternatives).

---

## Rationale

### Why OpenID Integration Is Low-Risk

Internet Identity is the identity bridge between OpenID providers and the Internet Computer. When a user signs in with Google through II:

1. II authenticates the Google credential via OIDC.
2. II issues a **cryptographic principal** to the requesting application — identical in format and behavior to a passkey-derived principal.
3. The BAMM backend receives only the principal. It is unaware of which sign-in method was used.

This means:
- **No backend code changes are required.** The admin role check (`requireRole()`) operates on principals and is unchanged.
- **No new authorization paths are introduced.** A principal derived from a Google sign-in goes through the exact same role-lookup and permission gate as any other principal.
- **No new attack surface is introduced at the application layer.** The OIDC trust chain is managed entirely by Internet Identity and DFINITY's infrastructure, not by BAMM.

### Why Convenience Matters for Admin Onboarding

The admin invitation workflow (DDR-001) sends a one-time temp password to a new admin's email. That admin must then log in with Internet Identity to claim the invite. For admins who already use managed Google or Microsoft accounts, requiring them to additionally create and store a passkey introduces unnecessary friction at a critical onboarding step. Offering a familiar "Sign in with Google" button reduces drop-off during admin activation without compromising security.

---

## Alternatives Considered

### Alternative 1: Custom Enterprise SSO via `www.bammservice.com`

**Description:** Register `www.bammservice.com` as an enterprise SSO provider in Internet Identity using DFINITY's planned "custom SSO sign-in" feature, which uses a `.well-known/openid-configuration` file on the domain to integrate an OIDC-compliant enterprise identity provider (e.g., Okta, Azure AD).

**Status: Deferred.** As of June 2026, this feature is implemented in the II backend canister but is **not enabled on mainnet**. No general-availability date has been announced by DFINITY. Additionally, `www.bammservice.com` is a marketing domain and does not currently sit behind an enterprise identity provider. Implementing this would require:
- An enterprise IdP (Okta, Azure AD, or similar) deployed behind the domain
- Coordination with DFINITY to enable the feature on mainnet
- Ongoing maintenance of the `.well-known` configuration

**Decision:** Track DFINITY release notes for mainnet GA. Revisit and supersede this DDR when the feature becomes available. See **Future** section.

### Alternative 2: Separate Email/Password Login for Admin Console

**Description:** Build a standalone email/password authentication system for the admin console, independent of Internet Identity.

**Rejected.** This would require implementing credential storage, hashing, reset flows, and session management in the Motoko backend — a significant security surface area to maintain. Internet Identity already provides a mature, audited authentication layer. Building a parallel system increases attack surface without meaningful benefit. Noted in DDR-001 as a future option but deferred indefinitely.

### Alternative 3: Do Nothing (Passkey Only)

**Description:** Keep the current passkey-only admin login. Admins who prefer Google/Microsoft create a passkey linked to their device.

**Not selected.** Passkeys remain fully supported and are the default. This alternative is not mutually exclusive — OpenID buttons are additive. The decision to add OpenID options does not remove or deprecate passkey support.

---

## Consequences

### Positive

- Reduced friction for admin onboarding — admins with managed Google or Microsoft accounts can sign in immediately without creating a new passkey.
- No backend changes required — principal equality means zero risk of breaking existing role assignments or authorization logic.
- Consistent with how many enterprise SaaS products handle authentication (social login as a convenience layer over a core identity system).
- Sets a foundation for future enterprise SSO integration when DFINITY enables it on mainnet.

### Negative / Trade-offs

- **Account linkage is provider-scoped within II:** A principal derived from a Google sign-in is distinct from a principal derived from a passkey, even for the same human user. If an admin first claimed their invite with a passkey and later attempts to sign in with Google, they will receive a different principal and will appear as a new, unpermissioned user. Mitigation: document this in admin onboarding instructions; admins should use one consistent sign-in method.
- **OpenID availability is controlled by DFINITY:** If DFINITY removes or restricts an OpenID provider within II, affected admins will need to migrate their login method. Risk is low given DFINITY's public commitment to OpenID support.

---

## Security Considerations

### Principal Equivalence

All Internet Identity sign-in methods — passkey, Google, Apple, Microsoft — produce a cryptographic principal for the application. The BAMM backend's authorization model is principal-based. No sign-in method receives elevated trust over any other. A Google-derived principal must satisfy the same role check as a passkey-derived principal.

### No New Credentials Stored

BAMM stores no OAuth tokens, OpenID ID tokens, or provider-side credentials. The only artifact stored is the II-issued principal, which is derived locally and cannot be used to re-authenticate outside the app's delegation scope.

### CVE Considerations

| Risk | Severity | Mitigation |
|---|---|---|
| Account hijack via compromised Google account | Medium | Mitigated by II's OIDC validation; BAMM has no control over Google account security. Admins should use hardware security keys or 2FA on their Google/Apple/Microsoft accounts. |
| Principal mismatch after sign-in method change | Low | Documented in onboarding. Admin retains access only if using the same principal that was registered during invite claim. |
| OIDC token replay attack | Low | II's delegation mechanism uses short-lived, scope-limited session tokens. Replay outside the delegation window is not possible. |
| Social engineering via fake II popup | Low | Internet Identity is served from `identity.ic0.app` (a DFINITY-controlled canister). The domain is visible to the admin in the browser. BAMM cannot and does not control the II UI. |

### Scope of Change

This decision affects only the **frontend `AuthClient` initialization** — specifically, whether an optional `openIdProvider` parameter is passed to the `AuthClient.login()` call. No backend code, no canister upgrades, no stable storage mutations, and no changes to the admin role system are required.

---

## Implementation Notes

- Pass `identityProvider` or `openIdProvider` hint to `AuthClient.login()` from `@dfinity/auth-client` when the user clicks a provider-specific button.
- Continue supporting passkey login as the default (no hint passed).
- The accept-invite and temp password claim flows work identically regardless of sign-in method — the principal is the binding key.
- Add a note to the admin onboarding email reminding admins to use the same sign-in method consistently after claiming their invite.

---

## Future

### Custom Enterprise SSO via `www.bammservice.com`

DFINITY is developing a "custom SSO sign-in" feature that allows organizations to register a `.well-known/openid-configuration` endpoint on their domain and use it as a sign-in option within Internet Identity. This would allow BAMM admins to sign in using `@bammservice.com` domain credentials managed through an enterprise IdP (Okta, Azure AD, etc.).

**Action:** Monitor the [DFINITY Forum](https://forum.dfinity.org) and Internet Identity release notes for mainnet GA announcement. When the feature is enabled on mainnet and an enterprise IdP is deployed behind `www.bammservice.com`, supersede this DDR with a new record covering the custom SSO integration.

---

## References

- [DDR-001: Admin Roles & RBAC System](DDR-001-Admin-Roles-RBAC.md)
- [Internet Identity Specification — DFINITY](https://internetcomputer.org/docs/current/references/ii-spec)
- [DFINITY Forum: Custom SSO Sign-In for Internet Identity](https://forum.dfinity.org)
- [OWASP A07:2021 — Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
