# DDR-001: Admin Roles & RBAC System

**Status:** Approved  
**Date:** 2026-06-01  
**Authors:** BAMM Engineering  
**Supersedes:** N/A  

---

## Context

The BAMM admin panel started as a binary gate: a principal either has the `#admin` role or it doesn't. All 37+ backend endpoints share identical full access. As the platform grows and additional administrators (features managers, license generators) are needed, this single-role model creates unacceptable security surface area.

The platform is deployed on the Internet Computer (ICP) and uses Internet Identity for authentication.

---

## Decision

Implement a 4-tier Role-Based Access Control (RBAC) system with the following roles:

### Role Hierarchy

| Tier | Role | Description |
|---|---|---|
| 0 | **Super Admin** | Account holder. Full access to everything including all admin management. Cannot be deleted, deactivated, or demoted by anyone. Only one exists. Can add other Super Admins. |
| 1 | **Administrator** | Full panel access. Can add/edit/delete all records. Can invite Features Managers and License Generators. Cannot touch the Super Admin. |
| 2 | **Features Manager** | Features Management panel only. No access to Submissions, Purchases, Logs, or Licenses. |
| 3 | **License Generator** | Read-only access to License Records. Can generate and send licenses. No other panel access. |

### Invitation Authority

- **Super Admin** can invite all tiers including other Super Admins
- **Administrator** can invite Features Manager and License Generator only
- **Features Manager** cannot invite anyone
- **License Generator** cannot invite anyone

### Panel Access Matrix

| Panel | Super Admin | Administrator | Features Manager | License Generator |
|---|---|---|---|---|
| Admin Management | Full | Invite lower tiers only | No | No |
| Features Management | Full | Full | Full | No |
| Submissions | Full | Full | No | No |
| Purchases | Full | Full | No | No |
| Email Delivery Logs | Full | Full | No | No |
| License Records | Full | Full | No | Read-only |
| License Generator | Full | Full | No | Yes |
| Installers | Full | Full | No | No |
| Audit Log | Full + download | Full + download | Full + download | Full + download |

### Super Admin Protections

- Cannot be deleted, deactivated, or demoted by anyone, including other Super Admins
- Visually distinct in the Admin Management table — all action buttons disabled for the Super Admin row
- The original account holder (first principal to claim the admin) is automatically designated Super Admin on canister upgrade
- Only one Super Admin exists by design; additional Super Admins can be invited by an existing Super Admin

---

## Authentication & Invite Flow

### Primary Authentication
Internet Identity remains the primary authentication mechanism for the admin console. This is unchanged.

### Invite Workflow
1. Super Admin or Administrator fills in the "Invite Admin" form (name, email, role)
2. Backend generates a cryptographically random 12-character temp password, stores only its SHA-256 hash with a 24-hour expiry (never stored in plaintext)
3. RESEND sends the invite email with the temp password (single-use)
4. Invited admin authenticates with their Internet Identity, enters the temp password to claim the invite
5. Their Internet Identity principal is linked to the admin record
6. They are immediately prompted to change their password
7. Super Admin sees their status change from `Pending` to `Active`

### Alternative Considered
Email/password login independent of Internet Identity was considered. Rejected for Phase 1 because it introduces a separate credential store and significantly increases the attack surface. Noted as a future option in the DDR for potential re-evaluation if Internet Identity proves too friction-heavy for invited admins.

---

## Audit Log

- All admins (all roles) can view and download the audit log
- The log records: principal (who), action (what), affected record ID (which), timestamp
- Audit log entries are append-only in backend state — no delete endpoint
- Super Admin and Administrator can see all entries; the log is not scoped by role

---

## CVE Security Analysis

### CRITICAL

**Broken Access Control (OWASP A01:2021 / CWE-284)**  
Frontend tab-hiding is UX only — it is not a security boundary. Every backend endpoint must enforce role checks independently using a `requireRole()` helper. The backend is the sole authoritative access control gate.

**Privilege Escalation Prevention (CWE-269)**  
Administrators cannot promote themselves to Super Admin. Only the Super Admin can appoint another Super Admin. Role assignment is validated server-side on every invite claim.

**Temp Password Security (CWE-312, CWE-287)**  
- Temp passwords are stored as SHA-256 hashes only — never plaintext
- 24-hour expiry enforced at claim time
- Single-use: invalidated immediately on successful claim
- The RESEND email delivery is the only transmission vector; the password is never logged

**Account Takeover via Invite Claim (CWE-287)**  
An attacker intercepting the invite email gets a token that is valid for 24 hours only, requires pairing with a valid Internet Identity principal, and is invalidated after first use.

### HIGH

**No Admin Session Expiry**  
Internet Identity sessions persist until explicitly signed out. A stolen device remains compromised indefinitely. Mitigation: document the risk; long-term solution is Internet Identity's session expiry mechanism.

**RSA Private Key at Rest (CWE-312)**  
The RSA private key is stored as plaintext in canister state. The key is used for license signing. Risk is mitigated by the fact that ICP canisters run in a TEE-like environment and state is only accessible via canister interfaces, but the key is theoretically visible to node operators. Long-term mitigation: IC vetKeys when available on mainnet. See DDR-003 for full key security analysis.

**No Rate Limiting on License Generation (CWE-770)**  
An authenticated admin can generate unlimited licenses. An idempotency guard exists on session ID but there is no rate limiter. Risk is low for the current deployment scale. Monitor for abuse.

### MEDIUM

**No Content Security Policy Headers**  
XSS risk on the admin panel is not currently mitigated by CSP headers. ICP asset canisters support custom headers via `headers` in asset configuration. Recommended: add CSP, X-Frame-Options, and X-Content-Type-Options headers.

**Debug Logs in Production**  
Previous builds wrote `stripe_debug`, `stripe_checkout`, `stripe_features` entries as top-level Email Delivery Log rows. These have been consolidated into transaction records (see DDR-005) but any new debug instrumentation should be gated on a backend debug flag, not written unconditionally to production state.

---

## Implementation Phases

### Phase 1 — Backend Foundation (non-breaking)
- Add `AdminRecord` type and stable storage in backend
- Migrate the current principal to Super Admin on canister upgrade
- Add `listAdmins`, `inviteAdmin`, `claimInvite`, `deactivateAdmin`, `deleteAdmin` endpoints
- All existing `isAdmin` guards remain active and unchanged

### Phase 2 — Role-Scoped Guards
- Add `requireRole(caller, minTier)` helper
- Update all endpoints to use the appropriate tier check
- Existing binary `isAdmin` check migrated to `requireRole(caller, #administrator)`

### Phase 3 — Admin Management Tab
- New 8th tab in admin panel, visible to Super Admin and Administrator
- Admin list with role badge, status (Active / Pending / Deactivated), last active, invite button
- Super Admin row shows all action buttons disabled

### Phase 4 — Email Invite Flow
- RESEND-based invite email with temp password
- Accept-invite page: Internet Identity auth + temp password claim
- Immediate password change prompt on first login

### Phase 5 — Security Hardening
- Admin activity audit log UI
- Rate limiting on license generation
- CSP headers
- Remove any remaining production debug log writes

---

## Consequences

**Positive:**
- Principle of least privilege enforced across all admin operations
- Features Managers and License Generators cannot access sensitive financial data
- Super Admin is protected from accidental or malicious demotion
- Audit trail provides evidence for future compliance review

**Negative / Trade-offs:**
- Internet Identity is the primary auth; invited admins who do not already have II must create one
- Lost Internet Identity principal for the Super Admin has no automatic recovery — recovery procedure must be documented and drilled
- Phase 1–5 implementation adds backend surface area; each endpoint must be carefully tested

---

## Open Issues

- Super Admin principal recovery procedure not yet designed
- Session expiry for Internet Identity admin sessions not yet enforced
- CSP headers not yet configured
- IC vetKeys not yet available on mainnet for key-at-rest protection

---

## References

- OWASP Top 10 2021: https://owasp.org/Top10/
- CWE-284 Improper Access Control: https://cwe.mitre.org/data/definitions/284.html
- CWE-269 Improper Privilege Management: https://cwe.mitre.org/data/definitions/269.html
- IC Internet Identity documentation: https://identity.ic0.app/
- IC vetKeys (future): https://internetcomputer.org/docs/current/developer-docs/smart-contracts/encryption/vetkeys
