# DDR-004: Stripe Payment Workflow & Post-Payment Automation

**Status:** Approved  
**Date:** 2026-06-01  
**Authors:** BAMM Engineering  

---

## Context

BAMM supports premium feature purchases via Stripe Checkout. After a successful payment, the system must automatically:
1. Verify the payment with Stripe
2. Extract the purchased features from the Stripe line items
3. Generate an RSA-signed license containing only the purchased features
4. Email the license to the customer via RESEND
5. Record the transaction in the Purchases and Submissions panels

This flow went through extensive iteration due to silent failures at each step.

---

## Decision

### Payment Verification

After Stripe redirects the user to `/payment-success?session_id=cs_live_...`, the frontend:

1. Waits 2 seconds (race condition guard — Stripe needs time to finalize the session after redirect)
2. Calls the backend `getStripeSessionStatus(sessionId)` endpoint
3. Retries up to 3 times with exponential backoff if the status is `"unknown"`
4. If all retries fail, shows "Verification Pending" with a support contact link

**Authentication format:** Stripe's API requires HTTP Basic Auth with the secret key as username and an empty password. The format is `Basic base64(sk_live_...:)`. Bearer token format (`Bearer sk_live_...`) is rejected by Stripe with 401.

### Feature Extraction

The backend calls Stripe's session endpoint with `?expand[]=line_items.data.price.product` to get purchased items with nested product names. Line item names from Stripe are matched against BAMM canonical feature names (see DDR-002). If the Stripe line item name does not exactly match a canonical name, flexible matching is attempted (lowercase, trim whitespace).

**Resolution order (first match wins):**

1. Parse `line_items` from the expanded session JSON (`description`, `nickname`, `product_data`, nested `name`)
2. **Checkout snapshot** — features computed from `ShoppingItem` cart at `createCheckoutSession` and stored in `sessionPurchasedFeatures`
3. **Session body scan** — active bundle names from `licenseBundles` plus canonical feature name substrings
4. **Dedicated line-items API** — `GET /v1/checkout/sessions/{id}/line_items` when the expanded session body is sparse

**Critical rule:** If all extraction methods fail, license generation is blocked — the system does NOT fall back to all active features. A failed feature extraction produces a `features_error` pipeline step and blocks fulfillment.

### JSON Response Parsing

Stripe's API returns prettified JSON with spaces after colons (`"url": "value"`). The backend JSON parser handles both compact (`"url":"value"`) and prettified (`"url": "value"`) formats.

### Post-Payment Record Writing

Records are written in this order to ensure auditability even if a later step fails:

1. **Write Purchases record** (immediately after payment verification succeeds)
2. Generate RSA-signed license
3. Send license via RESEND
4. Update Submissions record status to `"Licensed"`
5. Update Purchases record with `emailSent = true`

**Frontend contract:** `/payment-success` must call `getStripeSessionStatus` then `fulfillPaidLicense` on the canister actor. `fulfillPaidLicense` must be present in Candid/bindgen (`backend.did.js`); a missing IDL entry causes the agent to reject the call before the canister runs — transaction logs stall at `checkout_created` only.

**Actor readiness:** wait for `useActor()` to finish (`!isFetching && actor`) before calling the canister; provide a **Retry License Delivery** button on the verification-pending screen for stuck sessions.

This order ensures a Purchases record always exists for a verified payment, even if license generation or email delivery subsequently fails.

### Idempotency

The backend checks the Stripe session ID against existing Purchases records before processing. If a record already exists for the session ID, the entire post-payment flow is skipped and the frontend is shown the existing confirmation data. This prevents duplicate license emails from a page refresh or retry.

**Transaction log deduplication:** Each Stripe checkout creates a session-scoped log. Retries (failed fulfillment, new checkout) previously left abandoned `pending` rows alongside the successful `sent` row. The canister now prunes superseded incomplete logs when a buyer starts a new checkout, when payment is confirmed, and when a license is sent (matched by purchaser principal and/or recipient email). `getTransactionLogs` also hides superseded pending rows for display.

### BAMM Transaction ID

The BAMM transaction ID is derived from the last 4 characters of the Stripe session ID hash (uppercase). This provides a short, human-readable reference that is deterministic for a given session.

---

## Known Failure Modes & Mitigations

| Failure | Detection | Mitigation |
|---|---|---|
| Stripe key is test key on live session | `payment_status=unknown` in logs | Admin dashboard warns if `sk_test_` prefix detected |
| Race condition — session not yet finalized | `status=open` on first check | 2s delay + 3 retries |
| Line items empty or not parseable | `features_error` pipeline step | Checkout snapshot + line-items API + bundle body-scan; block license if all fail |
| Email delivery fails (RESEND error) | Log entry + Purchases `emailSent=false` | Admin can manually resend from License Records panel |
| Customer email unknown | `customer_details.email` null | Block processing, log error — do NOT use `unknown@customer.com` fallback |
| Duplicate payment processing | Session ID already in Purchases | Idempotency check blocks duplicate; return existing confirmation |

---

## Stripe Configuration

- **Mode:** Live (`livemode: true`)
- **UI Mode:** `hosted_page` — full redirect to Stripe's checkout page (not embedded)
- **Success URL:** `https://bamm-gw3.caffeine.xyz/payment-success?session_id={CHECKOUT_SESSION_ID}` — the `{CHECKOUT_SESSION_ID}` placeholder is replaced by Stripe at redirect time
- **Cancel URL:** `https://bamm-gw3.caffeine.xyz/payment-failure`
- **Automatic Tax:** Disabled (manual pricing)
- **Payment Methods:** card, klarna, link, cashapp, amazon_pay

---

## Alternatives Considered

**Stripe Webhooks:** Use Stripe's webhook delivery instead of session polling for post-payment events. Not implemented because ICP HTTP outcall infrastructure is caller-initiated only — the canister cannot receive inbound webhook HTTP calls from Stripe. Polling the session status on the success page is the correct ICP-native alternative.

**Frontend RSA signing:** Early implementations had the frontend sign the license payload using the RSA private key stored in the admin browser session. Rejected — the customer's browser does not have the private key. All signing must happen in the backend canister.

---

## Consequences

**Positive:**
- Post-payment flow is fully automatic — no admin intervention required
- Purchases record is always written before email, ensuring auditability
- Idempotency guard prevents duplicate license emails
- Feature scoping is enforced — customers only receive what they paid for

**Negative:**
- If Stripe's API is unreachable from the ICP node (network partition), verification retries will exhaust and show "Verification Pending"
- The race condition delay adds 2 seconds to the post-payment page load

---

## References

- Stripe Checkout documentation: https://stripe.com/docs/payments/checkout
- Stripe session expand: https://stripe.com/docs/api/checkout/sessions/retrieve
- ICP HTTP outcalls: https://internetcomputer.org/docs/current/developer-docs/smart-contracts/advanced-features/https-outcalls/
