#!/usr/bin/env bash
# Run ic-mops from src/ (Caffeine VM layout — DDR-022).
set -euo pipefail
SRC_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SRC_ROOT"
exec npx -y ic-mops@latest "$@"
