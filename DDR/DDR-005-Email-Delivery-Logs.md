# DDR-005: Email Delivery Logs Redesign

**Status:** Approved  
**Date:** 2026-06-01  
**Authors:** BAMM Engineering  

---

## Context

The original Email Delivery Logs table had one row per event. A single payment transaction generated 7+ rows:

- `stripe_checkout` — checkout session created
- `stripe_debug` — raw Stripe response (first 500 chars)
- `stripe_features` — line items parse result
- `stripe_payment` — payment confirmed
- `stripe_submission` — submission record updated
- License email sent (sometimes duplicated)

This produced a cluttered, confusing log table where admins could not easily determine whether a transaction completed successfully. Debug events were intermixed with real email delivery events.

---

## Decision

### Consolidated Transaction Log Model

Email Delivery Logs are redesigned to one **transaction record** per payment, with all pipeline sub-events stored as structured fields within the record.

### Log Table (One Row Per Transaction)

| Column | Description |
|---|---|
| Recipient | Customer email address |
| Subject | License email subject line |
| Transaction ID | BAMM short transaction ID (e.g., `BAMM-CJFV`) |
| Date | Timestamp of the final license send |
| Status | `sent` / `failed` / `pending` |

### Transaction Detail Modal

Clicking any row opens a modal showing:

- **Header:** Transaction ID, Stripe session ID, recipient email, date
- **Timeline:** Ordered pipeline steps with timestamps:
  - Checkout Created
  - Payment Confirmed
  - Features Extracted (list of features)
  - Submission Added
  - License Generated
  - License Sent
- **Amount Paid:** From Stripe `amount_total` (in cents, displayed as dollars)
- **Download Transaction Log (.json):** Exports the full structured record as `BAMM-Transaction-{id}.json`

### Pipeline Debug Events

`stripe_debug`, `stripe_checkout`, `stripe_features`, `stripe_payment`, and `stripe_submission` are no longer written as top-level log rows. They are captured as sub-events within the transaction record and only visible in the modal timeline and the downloaded .json.

### Idempotency Fix

The duplicate license email problem was caused by the idempotency check scanning email addresses instead of session IDs. The check now uses the Stripe session ID as the unique key — a session can only produce one license email record.

### Legacy Entries

Existing log entries created before this redesign (including old `stripe_debug` rows and `unknown@customer.com` entries) are displayed in a "Legacy Email Logs" collapsible section at the bottom of the table. They can be bulk-deleted via the existing multi-select feature.

---

## Alternatives Considered

**Keep individual rows, add grouping:** Group rows by session ID with expand/collapse. Rejected — it still presents debug events as first-class log entries, and the grouping logic adds complexity without improving the data model.

**Separate debug log panel:** Move debug events to a separate "System Logs" panel. Considered for Phase 5 hardening — acceptable alternative if the consolidated model proves insufficient for debugging.

---

## Consequences

**Positive:**
- Admins see exactly one row per customer transaction
- Complete transaction history is available in the modal
- Downloadable .json enables external audit and support escalation
- Debug events are preserved in the data model but not cluttering the main view

**Negative:**
- Historical pre-redesign records are displayed as legacy entries and cannot be retroactively promoted to the new format
- The modal requires the frontend to maintain transaction-level state rather than simple log arrays

---

## References

- Email delivery via RESEND: https://resend.com/docs
- BAMM admin panel Email Delivery Logs tab
