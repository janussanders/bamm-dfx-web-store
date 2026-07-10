#!/usr/bin/env bash
# Run mops from repo root so [moc] args (--default-persistent-actors) apply (DDR-017 §4).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec npx -y ic-mops@latest "$@"
