# DDR-031: Agent-ready marketing + entitlement legal language

**Date:** 2026-07-08  
**Status:** Approved (engineering draft — counsel review required)  
**Related:** [DDR-007](DDR-007-Legal-Document-Alignment.md), [DDR-030](DDR-030-Admin-License-Management-V2.md), BAMM `installer/EULA.txt`, BAMM enterprise legal alignment DDR

## Problem

1. Storefront and desktop marketing named a third-party IDE brand ("Cursor") in AI setup tips, creating trademark/endorsement risk.
2. Terms / Privacy / Refunds and the desktop installer EULA did not clearly describe networked entitlement records (non-financial license-control data) or state that activation non-compliance is non-refundable.

## Decision

### Marketing

Replace Cursor-named tips with **agent-ready** language:

> Agent-ready tip: BAMM is built for agentic desktop workflows. Pair it with your preferred local AI co-pilot…

No third-party product names in customer-facing copy.

### Legal (storefront `src/frontend/src/legal/copy.ts`)

- Terms §4: networked entitlements, activation window, forfeiture, no refund for activation non-compliance
- Privacy §3: entitlement registry fields; explicit that financial records are not stored there
- Refunds §3: no refund for entitlement activation non-compliance (except where required by law)
- Effective date: July 8, 2026

### Legal (desktop `installer/EULA.txt`)

Parallel sections: entitlement activation (§1.3), non-financial entitlement privacy (§3.2), refunds / non-compliance (§6).

## Files

| Repo | Path |
|------|------|
| e-commerce | `src/frontend/src/legal/copy.ts`, `marketing.ts` |
| BAMM | `installer/EULA.txt`, `frontend/src/utils/bundleEntitlements.ts`, `Manage.tsx` |

## Operator

Deploy storefront tag after merge; next desktop installer build ships updated EULA. Counsel review before marketing scale.
