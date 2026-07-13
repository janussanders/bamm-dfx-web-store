# BAMM dfx Web Store — Design Decision Records

## Dfx parallel path (active)

| ID | Title | Status | Date |
|----|-------|--------|------|
| [DDR-001](DDR-001-BAMM-Dfx-Web-Store-Parallel-Path.md) | Parallel path & production freeze | Approved | 2026-07-10 |
| [DDR-002](DDR-002-Dfx-Internet-Identity-Security.md) | Internet Identity & security | Approved | 2026-07-10 |
| [DDR-003](DDR-003-Dfx-Object-Storage-Replacement.md) | Object storage replacement | Implemented | 2026-07-10 |
| [DDR-004](DDR-004-Dfx-CI-Deploy-Agentic-URL.md) | CI deploy & agentic test URL | Implemented (live) | 2026-07-10 |
| [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md) | Chunked installer upload (2 MiB limit) | Implemented | 2026-07-10 |
| [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md) | EOP field append order / IC0503 | Implemented (lock) | 2026-07-10 |
| [DDR-007](DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md) | CI identity, cycles, deploy pitfalls | Implemented (lock) | 2026-07-10 |
| [DDR-008](DDR-008-Dfx-Primary-Caffeine-Backup.md) | Dfx primary / Caffeine backup | Approved | 2026-07-12 |
| [DDR-009](DDR-009-Custom-Domain-Bammservice.md) | Custom domain store.bammservice.com → IC (Option A) | Implemented | 2026-07-12 |
| [DDR-010](DDR-010-Email-Banner-Resend-Status.md) | Email banner false negative fix | Implemented | 2026-07-12 |
| [DDR-037](DDR-037-Free-Features-Marketing-Images.md) | Free Features admin images → homepage Learn More | Implemented | 2026-07-13 |
| [DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md) | IC0503: when frontend vs backend deploys succeed | Implemented (lock) | 2026-07-13 |
| [DDR-039](DDR-039-Feature-Image-List-Query-Overflow.md) | Feature images blow list queries → false empty Admin | Implemented | 2026-07-13 |
| [DDR-040](DDR-040-Feature-Image-Lightbox.md) | Free/Premium image lightbox + Premium View chip | Approved (design) | 2026-07-13 |

**Runbook:** [docs/dfx-deploy.md](../docs/dfx-deploy.md) · **CI identity:** [docs/dfx-ci-identity.md](../docs/dfx-ci-identity.md)

### Failure → DDR map (quick)

| Failure | Read |
|---------|------|
| Installer bar → 100%, file missing | [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md) |
| `Memory-incompatible program upgrade` / IC0503 on backend upgrade | [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md) + [DDR-038](DDR-038-Dfx-IC0503-Deploy-Decision-Tree.md) |
| Features Management empty after image upload / wants re-init | [DDR-039](DDR-039-Feature-Image-List-Query-Overflow.md) |
| Premium image click steals selection / lightbox vs Stripe | [DDR-040](DDR-040-Feature-Image-Lightbox.md) |
| dfx hang / keyring; cycles create vs install; pnpm TTY; no admin after II | [DDR-007](DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md) |
| No Super Admin after II login | [DDR-002](DDR-002-Dfx-Internet-Identity-Security.md) |
| Email ready but yellow “Configuration Required” banner | [DDR-010](DDR-010-Email-Banner-Resend-Status.md) |
| Point brand URL at IC frontend | [DDR-009](DDR-009-Custom-Domain-Bammservice.md) |

## Legacy Caffeine DDRs (lineage only)

The numbered Caffeine DDRs from `bamm-e-commerce-site` remain in this tree as historical reference from baseline **`v133.0.17`**. They describe the Caffeine production system. **Do not** treat Caffeine deploy locks (DDR-021/026/027) as constraints on this dfx repo. Legacy [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md) covers Caffeine-specific IC0503 causes — for **this** repo’s EOP field-order trap use [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md).

**Number collision:** legacy file `DDR-008-LicenseSigner-Core-List-Not-Buffer.md` (Caffeine Motoko core) is **not** the active [DDR-008](DDR-008-Dfx-Primary-Caffeine-Backup.md) (dfx primary / Caffeine backup).
