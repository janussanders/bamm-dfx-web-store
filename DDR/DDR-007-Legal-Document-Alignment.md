# DDR-007: Legal Document Alignment (Phase 0 — Step 6)

**Date:** 2026-06-18  
**Status:** Implemented on `main` (engineering draft — counsel review required)  
**Release tag:** `v119.0.0` (Caffeine import ref — superseded `v118.x` / `main`-only workflow)  
**Related:** BAMM `docs/ddr/enterprise/2026-06-18-legal-security-financial-liability-framework.md`

## Decision

Publish unified **Terms of Service**, **Privacy Policy**, and **Refund Policy** on the IC storefront, linked from footer, download form, and checkout.

## Changes

- `src/frontend/src/legal/copy.ts` — single source of legal copy (entity: **BAMM SERVICES INC.**, governing law: **Washington State** — not Delaware)
- Routes: `/terms`, `/privacy`, `/refunds`
- Footer links + canonical `support@bammservice.com`
- Landing privacy copy aligned (financial records local; site collects name/email only)
- Landing marketing copy centralized in `src/frontend/src/legal/marketing.ts`
- Trades / Tx Simulator disclaimers on landing premium accordion
- Full landing page compliance pass: hero, tiles, accordions, get-started steps, legal notice; removed overclaims and sign-up contradiction
- Premium shop, download modal, download/payment success pages aligned to `marketing.ts`
- Backend default feature descriptions and license email bodies aligned (entity, privacy, regulated-feature disclaimers)
- `index.html` meta entity normalized

## Gate

Counsel must approve text before broad marketing or subscription launch. Desktop installer EULA updated in parallel on BAMM repo (`feature/v26.0.12-legal-hygiene` / PR #73).

## Caffeine deploy workflow

Push to **`main`**, tag (e.g. **`v119.0.2`**), push tag. Prompt Caffeine composer with **tag + commit + forced clean rebuild + explicit production asset upload**.

1. Commit and push to `main`
2. `git tag -a v119.0.2 -m "…"` && `git push origin v119.0.2`
3. Composer prompt: tag, full commit hash, forced clean rebuild, explicit asset upload to production, promote to `bamm-gw3`
4. Wait ~60s after import; verify production URL (not draft alone)

See [README.md — Caffeine composer prompt](../README.md#caffeine-composer-prompt-required-every-deploy).
