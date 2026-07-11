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

**Runbook:** [docs/dfx-deploy.md](../docs/dfx-deploy.md) · **CI identity:** [docs/dfx-ci-identity.md](../docs/dfx-ci-identity.md)

### Failure → DDR map (quick)

| Failure | Read |
|---------|------|
| Installer bar → 100%, file missing | [DDR-005](DDR-005-Dfx-Chunked-Installer-Upload.md) |
| `Memory-incompatible program upgrade` / IC0503 on backend upgrade | [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md) |
| dfx hang / keyring; cycles create vs install; pnpm TTY; no admin after II | [DDR-007](DDR-007-Dfx-CI-Identity-Cycles-Deploy-Pitfalls.md) |
| No Super Admin after II login | [DDR-002](DDR-002-Dfx-Internet-Identity-Security.md) |

## Legacy Caffeine DDRs (lineage only)

The numbered Caffeine DDRs from `bamm-e-commerce-site` remain in this tree as historical reference from baseline **`v133.0.17`**. They describe the Caffeine production system. **Do not** treat Caffeine deploy locks (DDR-021/026/027) as constraints on this dfx repo. Legacy [DDR-017](DDR-017-IC0503-Memory-Incompatible-Upgrade.md) covers Caffeine-specific IC0503 causes — for **this** repo’s EOP field-order trap use [DDR-006](DDR-006-Dfx-EOP-Actor-Field-Append-Order.md).
