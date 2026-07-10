# DDR-002: Internet Identity & security (dfx)

**Date:** 2026-07-10  
**Status:** Approved (design)  
**Parent:** [DDR-001](DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md)

## Does dfx use Internet Identity?

**Yes.** Same DFINITY Internet Identity as Caffeine (`https://identity.ic0.app`), including Google / Apple / Microsoft via II. Caffeine only wrapped II in `@caffeineai/core-infrastructure`; dfx uses stock `@dfinity/auth-client` (thin in-repo provider).

## What you do on first visit

1. Open the dfx frontend URL  
2. Sign in with Internet Identity (create or use existing II)  
3. Claim **Super Admin** with the one-time claim code  
4. Invite other admins as needed  
5. Upload Stripe key, RESEND key, license PEM, installers  

## Security model (same as Caffeine app layer)

| Layer | Mechanism |
|-------|-----------|
| Auth | II principal |
| Authorization | Motoko RBAC (`adminRecords`, roles) |
| Secrets | Canister stable vars (admin-uploaded) — never commit to git |
| Public checkout | Unauthenticated Stripe session + fulfill (rate-limited) |

## Important

- New frontend origin ⇒ **new II principals** for the same person  
- Caffeine admins are **not** automatically admins here  
- Use **test** Stripe/RESEND keys on the parallel store until cutover  

## Local vs IC

| Network | II |
|---------|-----|
| `dfx start` local | Local II canister or mainnet II |
| IC staging / agentic URL | Mainnet II |
