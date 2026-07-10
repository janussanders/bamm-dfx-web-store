# DDR-002: RSA License Generation & Canonical Feature Names

**Status:** Approved  
**Date:** 2026-06-01  
**Authors:** BAMM Engineering  

---

## Context

The BAMM desktop application validates licenses using RSA public-key cryptography with SHA-256. The license payload is a JSON object containing the list of enabled features. The desktop app validates feature names by exact string match against a hardcoded list. A single character difference in a feature name causes validation failure and disables the feature for the user.

Early builds had persistent naming conflicts where license generation used display names instead of the canonical validation names, causing silent feature unlock failures in the desktop app.

---

## Decision

### Canonical Feature Names (LOCKED)

The following six names are the sole canonical identifiers for RSA license generation. These names are exact-match validated by the BAMM desktop application and must never be changed:

```
"Paycheck Budget"
"Goals"
"Tx Simulator"
"Migration Management"
"Database Management"
"Trades"
```

### License Payload Format (LOCKED)

```json
{
  "payload": {
    "features": ["Database Management"],
    "issued_to": "customer@email.com",
    "expires": "2027-06-01T00:00:00.000Z",
    "generated_by": "BAMM License Generation System",
    "generated_at": "2026-06-01T00:00:00.000Z"
  },
  "signature": "<RSA-SHA256-base64>"
}
```

**Rules:**
- `generated_by` must be exactly `"BAMM License Generation System"` — no variations
- `features` must contain only names from the canonical list above
- Trial licenses are delivered as `30-days-Free.json`
- Paid licenses are delivered as `BAMM-License.json`
- Paid licenses contain only the features the customer actually purchased (never all active features)

### License Reference Name Dropdown

The Features Management panel includes a "License Reference Name" dropdown on both Add and Edit feature forms. The dropdown is pre-populated with exactly the six canonical names above. Selecting the correct reference name for each product ensures that all license generation flows (trial, paid, manual admin) use the validated name regardless of display name changes.

### Database Management vs Migration Management Resolution

The product previously stored as `migration-management` ID with display name "Database Management" caused confusion because both `Migration Management` and `Database Management` are valid canonical names.

**Final resolution:** The `migration-management` product ID maps definitively to **`"Database Management"`** as its License Reference Name. This is the canonical name validated by the BAMM desktop app for that feature. `"Migration Management"` remains a valid canonical name available in the dropdown but is not currently mapped to any active product — it can be assigned to a future product if needed.

---

## RSA Signing Process

1. Assemble the full payload object including all fields
2. Serialize to JSON with deterministic field ordering — **must byte-match `JSON.stringify(payload)` in Node.js** (no spaces after commas in arrays; field order: `features`, `issued_to`, `expires`, `generated_by`, `generated_at`)
3. Sign with RSA-SHA256 using the private key (PKCS#1 v1.5)
4. Base64-encode the signature
5. Wrap in the `{ payload, signature }` envelope
6. The public key bundled with the BAMM desktop app verifies the signature

**Critical:** The entire payload must be assembled before signing. Signing a partial payload and then adding fields produces an invalid signature.

---

## Key Management

See DDR-003 for RSA private key persistence and security model.

---

## Alternatives Considered

**Display name matching:** Use the product display name for license generation. Rejected — display names can be changed by admins and would immediately break existing licenses.

**Numeric feature IDs:** Use integer IDs instead of strings. Rejected — the BAMM desktop app validates strings; changing the format would require a desktop app update to all existing users.

**JWT-based licenses:** Use JWT instead of custom RSA+JSON. Rejected — the desktop app already implements and ships its own RSA+JSON verification. Changing the format requires a coordinated desktop app release.

---

## Consequences

**Positive:**
- Canonical names are centrally enforced at the database level via the dropdown
- Display name changes in Features Management do not affect license validity
- Future feature additions are safe as long as the dropdown is populated before generating licenses

**Negative:**
- Admins must select the correct License Reference Name when adding features — a misconfiguration is not immediately visible
- Adding a new feature requires coordinating the canonical name with the BAMM desktop app team before the first license is generated

---

## References

- Example valid license payload (validated by desktop app): stored in BAMM admin documentation
- RSA-SHA256 signing: PKCS#1 v1.5 standard
- BAMM desktop app license validator: bundled public key `public.pem`
