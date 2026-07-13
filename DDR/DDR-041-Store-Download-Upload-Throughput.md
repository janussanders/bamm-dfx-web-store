# DDR-041: Store download / upload throughput engineering

**Date:** 2026-07-13  
**Status:** Phase A implemented (parallel upload + download) — Phase B decision pending  
**Type:** Architecture / Performance / Cost  
**Site:** https://store.bammservice.com  
**Scope:** Customer **download** speed (priority), admin **upload** efficiency (secondary)  
**Parents:** [DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md), [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md), [DDR-009](DDR-009-Custom-Domain-Bammservice.md), [DDR-029](DDR-029-Storefront-Installer-Version-Visibility.md)

## Question

How should we engineer faster installer (and related asset) delivery on the dfx storefront so post-purchase / trial customers are not waiting minutes for a ~110–140 MiB DMG/EXE — and what are the trade-offs?

## Current state (baseline)

### Architecture today

| Layer | What | Mechanism |
|-------|------|-----------|
| SPA / static | `store.bammservice.com` → frontend asset canister `5xyyv-…` | HTTPS via IC boundary / custom domain — **adequate** for JS/CSS |
| Installers | Backend Motoko `5z2v5-…` heap `macInstallerStore` / `windowsInstallerStore` | Chunked candid **queries** ≤1.5 MiB (DDR-003/005) |
| Feature images | Same backend heap | Single-query blobs ≤~450 KiB compressed (DDR-039) |
| Licenses | Generated on-canister | **Emailed** via RESEND — not browser download |

Customer download path (`chunkedInstaller.ts`):

```
getPublic*Meta → concurrent pool (K=6): download*Chunk(i)  [PARALLEL]
→ reassemble by index → <a download>
```

Admin upload path (same helper):

```
begin*Upload → concurrent pool (K=6): upload*Chunk(i)  [PIPELINED]
→ finalize*Upload
```

Backend already accepts out-of-order chunks (`Map<Nat, Blob>`). Downloads are IC **queries** (true parallelism). Uploads are IC **updates** (canister still serializes execution; overlapping in-flight calls mainly hide RTT).

For a ~120 MiB DMG: **N ≈ 80** query round-trips through `@dfinity/agent` → `icp-api.io` boundary. Docs previously expected **minutes** on mainnet when sequential (DDR-005).

### Bottleneck ranking (customer-facing)

| Rank | Bottleneck | Why it hurts |
|------|------------|--------------|
| **1** | **Sequential chunk queries** | Latency dominated by RTT × chunk count, not raw bytes/sec |
| **2** | **Candid + agent overhead** | Every chunk is a full IC query (encode/decode, consensus read path), not HTTP range GET |
| **3** | **No edge cache for binaries** | Every customer pulls all bytes from the canister; no CDN HIT |
| **4** | Heap holding ~250 MiB Mac+Windows | Cycle/memory cost; unrelated to *speed* but limits scale |
| **5** | SPA asset delivery | Usually fine; not the complaint |

Upload (admin) is slower still (chunk **updates**), but rare and not customer-facing.

### What is *not* broken

- Chunking itself (required by IC 2 MiB ingress / ~3 MiB query caps).
- Brand domain for SPA.
- License delivery via email (orthogonal to DMG speed).

---

## Goals / non-goals

**Goals (priority order)**

1. Cut customer installer download wall-clock toward **browser-native HTTPS** feel (target: **tens of seconds** for ~120 MiB on a good home link, not minutes).
2. Keep **anonymous** public download (no II required) and current UX (`/download-success`).
3. Preserve admin ability to replace installers without a full frontend redeploy.
4. Prefer solutions that survive IC0503 backend-upgrade friction ([DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md)).

**Non-goals**

- Moving license issuance off RESEND.
- Perfect parity with Caffeine `blob.caffeine.ai` internals.
- Optimizing SPA first-paint beyond normal Vite/asset hygiene unless free.

---

## Options

### Option 0 — Quick win: parallel chunk transfer (frontend-only) — **done**

**Idea:** Keep canister storage; change `uploadInstallerChunked` / `downloadInstallerChunked` to transfer **K concurrent** chunks (K=6) with a worker pool + progress = `completed/totalChunks` + per-chunk retries.

| | |
|--|--|
| **Effort** | Small — `chunkedInstaller.ts` only; frontend deploy |
| **Speed (download)** | Often **2–5×** wall-clock if RTT-bound (80 RTTs → ~10–20 effective) |
| **Speed (upload)** | Smaller gain — updates consensus-serialize; still hides some RTT via pipelining |
| **Cost** | Negligible (same query/update bytes; slightly higher concurrent boundary load) |
| **Risk** | Browser connection limits; agent concurrency quirks; need retry/backoff per chunk |
| **Pros** | No Motoko change; no IC0503; no new vendor; ships under current deploy rules |
| **Cons** | Still candid/IC; still no CDN; ceiling far below S3/R2 |

**Verdict:** Shipped as Phase A for **both** upload and download.

---

### Option 1 — IC asset canister for installers (DDR-003 Option B)

**Idea:** Store DMG/EXE as files on an **asset canister** (dedicated or frontend). Backend keeps metadata (`fileName`, `sha256`, `assetPath`, version). Browser downloads via **direct HTTPS URL** (`https://store…/installers/BAMM-….dmg` or `*.icp0.io/...`).

| | |
|--|--|
| **Effort** | Medium–high (asset sync pipeline in CI or admin upload tool; Motoko metadata; frontend URL switch) |
| **Speed** | **Large** — single HTTP GET (or few ranges); boundary nodes behave more like static CDN than N candid queries |
| **Cost** | Asset canister cycles/storage; CI complexity; larger wasm/asset sync |
| **Risk** | Asset canister size limits / sync time; custom-domain path routing; need authenticated admin upload story |
| **Pros** | Stays on IC; brand domain possible; no AWS/Cloudflare account for binaries |
| **Cons** | Admin “replace installer” harder than chunked Motoko API; IC0503 still bites if metadata lives on Motoko; not a global CDN |

**Verdict:** Strong **IC-native** mid-term if we want to avoid third-party blob hosting.

---

### Option 2 — External object storage + CDN (S3/R2/GCS + Cloudflare/CloudFront)

**Idea:** Admin upload (or CI after GitHub Actions desktop build) puts installers on **R2/S3**. Public downloads use **HTTPS + CDN**. Motoko stores only **URL + sha256 + version** (small). Storefront `<a href>` or fetch from CDN.

| | |
|--|--|
| **Effort** | Medium (bucket, CDN, signed/public URLs, CI publish, Motoko metadata, admin UI) |
| **Speed** | **Best** for customers — edge POP, HTTP/2, range requests, resumable downloads |
| **Cost** | Storage ~pennies/GB; **egress** is the real bill (Cloudflare R2 zero egress is attractive; S3+CloudFront paid egress) |
| **Risk** | Second trust domain; CORS; cache purge on replace; secrets in CI; brand URL vs CDN hostname |
| **Pros** | Industry-standard software distribution; scales to many concurrent downloaders |
| **Cons** | Leaves “all data on IC” purity; operational surface (bucket IAM, CDN config) |

**Sub-variants**

| Variant | Notes |
|---------|--------|
| **2a Cloudflare R2 + custom domain** | Zero egress fees; good CDN story; recommended if choosing external |
| **2b AWS S3 + CloudFront** | Familiar; watch egress |
| **2c GitHub Releases as origin** | Already produce `.dmg`/`.exe` on desktop tags — free/cheap; rate limits / UX less polished; fine for early traffic |

**Verdict:** Best **customer download** experience and cost/benefit if external hosting is acceptable. Aligns with desktop CI already emitting installers.

---

### Option 3 — Hybrid: CDN for public installers, Motoko for secrets/images

**Idea:** Installers → Option 1 or 2. Feature images / PEM / entitlements stay on Motoko (or images → asset canister small files).

| | |
|--|--|
| **Effort** | Medium (scoped to installers only) |
| **Speed** | Same as 1/2 for the pain point |
| **Cost** | Contained |
| **Pros** | Minimal blast radius; matches “download is the problem” |
| **Cons** | Two storage systems |

**Verdict:** Recommended **product shape** once Phase A is done — whether CDN or asset canister.

---

### Option 4 — HTTP gateway on Motoko (`http_request` streaming)

**Idea:** Expose installers as canister HTTP with chunked/streaming responses.

| | |
|--|--|
| **Effort** | High |
| **Speed** | Better than candid loops if streaming works well; still IC boundary, not global CDN |
| **Risk** | Motoko HTTP response size limits; complex; IC0503 for large actor changes |
| **Pros** | Single canister URL |
| **Cons** | Reinvents what asset canisters / CDNs already do |

**Verdict:** **Not recommended** vs Options 1–2.

---

### Option 5 — Compression / smaller artifacts

**Idea:** Ship smaller installers (app thinning, delta updates, separate “download manager”).

| | |
|--|--|
| **Effort** | Product/packaging (Electron) — large |
| **Speed** | Linear with size; helps every option |
| **Pros** | Structural win |
| **Cons** | Does not remove sequential candid tax; long lead time |

**Verdict:** Parallel track for desktop packaging; not a storefront-only fix.

---

## Cost / benefit matrix (customer download)

Assume ~120 MiB installer, 100 downloads/month early, growing to 1 000/month.

| Option | Est. customer TTFB→done | Eng effort | Monthly $ (order of magnitude) | Ops burden | Fit with IC0503 constraints |
|--------|-------------------------|------------|--------------------------------|------------|------------------------------|
| **Today** | Minutes | — | Cycles only | Low | Status quo |
| **0 Parallel chunks** | ~0.3–0.5× today | S | ~0 | Low | Best (frontend-only) |
| **1 Asset canister** | Tens of seconds | M–L | Cycles | Medium | Medium (metadata on Motoko) |
| **2a R2 + CDN** | Best (edge) | M | Storage ≈ \$0–few; egress ≈ \$0 on R2 | Medium | High (Motoko URL-only) |
| **2c GitHub Releases** | Good | S–M | \$0 | Low | High |
| **4 HTTP stream** | Better than today | L | Cycles | High | Low |

**Benefit priority:** Option **0** (fast, cheap) → then **2a or 2c** (or **1** if IC-only is mandatory) for step-change UX.

---

## Upload (admin) — secondary

| Approach | Effect |
|----------|--------|
| Parallel chunk **updates** | Limited benefit (update consensus serializes; may still help pipeline slightly) |
| Admin uploads to R2/S3/CI | **Best** — CI attaches desktop build artifacts; admin only flips “current version” pointer on Motoko |
| Keep Motoko chunk upload | Acceptable if rare (once per desktop release) |

Recommended long-term: **CI publishes installers to CDN/R2 (or GitHub Release)** → admin or CI sets Motoko `installerUrl` + `sha256` + filename (DDR-029 labels stay).

---

## Recommended roadmap

### Phase A — Implemented (2026-07-13)

1. **Parallelize** customer chunk **download** and admin chunk **upload** (concurrency 6, 3 retries, progress by completed chunks) in `src/frontend/src/lib/chunkedInstaller.ts`.
2. Measure wall-clock before/after on mainnet (Mac + Windows) and document here.
3. Optional UX: show MB/s + ETA; “resume” by caching completed chunk indices in `IndexedDB` (nice-to-have).

**Success metric:** ≥2× faster median **download** on a reference connection without changing storage.

**Note on upload:** Same engineering cost; expected wall-clock gain is smaller than download because update consensus cannot fully parallelize. Still worth it for admin UX (pipelined RTTs + retries).

### Phase B — Decision gate (pick one)

Choose based on policy:

| If… | Then… |
|-----|--------|
| **Must stay IC-only** | Option **1** (asset canister) + Motoko metadata |
| **OK with external blobs** (recommended for UX) | Option **2a** R2+CDN **or** **2c** GitHub Releases as interim |
| Unsure | Spike **2c** in 1–2 days using existing Actions artifacts; A/B against Phase A |

### Phase C — Hardening

- `sha256` verify in browser before save (integrity).
- Cache-Control / versioned URLs (`…/BAMM-30.3.19-arm64.dmg`) so CDN invalidation is trivial.
- Fix `incrementDownloadCount` if analytics matter (today admin-only trap; silent fail for customers).
- Cycle/memory report for remaining Motoko blobs if installers leave the heap.

---

## Decision criteria (for approval)

Score each option 1–5 (higher better):

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Customer download latency | **5** | Primary |
| Engineering time to first improvement | 4 | Prefer Phase A |
| Monthly cost at 1k downloads | 3 | Prefer R2 / GH |
| Operational complexity | 3 | Prefer fewer systems |
| IC purity / no third-party blobs | 2 | Policy call |
| Survives Motoko IC0503 | 3 | Prefer frontend + URL metadata |

---

## Open questions

1. Is **external hosting** of public installers acceptable (license/TOS already public binaries)?
2. Target SLA: e.g. **p50 &lt; 60s** for 120 MiB on 50 Mbps down?
3. Prefer **GitHub Releases** interim vs go straight to **R2**?
4. Keep Motoko chunks as **fallback** if CDN URL unset (hybrid safety)?

---

## Related code / canisters

| Asset | Path / ID |
|-------|-----------|
| Chunked download | `src/frontend/src/lib/chunkedInstaller.ts` |
| Download UX | `src/frontend/src/pages/DownloadSuccess.tsx` |
| Motoko stores | `src/backend/main.mo` (`*InstallerStore`, `download*Chunk`) |
| Frontend canister | `5xyyv-paaaa-aaaao-bbebq-cai` |
| Backend canister | `5z2v5-uqaaa-aaaao-bbeaq-cai` |
| Brand | https://store.bammservice.com |

## Related DDRs

- [DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md) — Option A shipped; B/C deferred  
- [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md) — chunk lock; “minutes per 100 MiB”  
- [DDR-029](DDR-029-Storefront-Installer-Version-Visibility.md) — filenames without blob fetch  
- [DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md) — prefer frontend-only when possible  
- [DDR-039](DDR-039-Feature-Image-List-Query-Overflow.md) — image size discipline (orthogonal)

---

## Proposed next action

**Deploy frontend** with Phase A (parallel upload + download), measure mainnet wall-clock, then **decide Phase B** (IC asset vs R2/GitHub).
