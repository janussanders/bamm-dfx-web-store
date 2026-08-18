#!/usr/bin/env bash
# DDR-044 — publish ops/cycles-health.json to branch cycles-health.
# Does not dfx deploy / reinstall. Does not touch Caffeine or main.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${CYCLE_HEALTH_PATH:-$ROOT/ops/cycles-health.json}"
if [ ! -f "$SRC" ]; then
  SRC="$ROOT/.cache/cycles-health.json"
fi
if [ ! -f "$SRC" ]; then
  echo "::error::cycles-health.json missing — sentinel did not write a snapshot"
  exit 1
fi

python3 - "$SRC" <<'PY'
import json, sys
p = sys.argv[1]
data = json.load(open(p))
backend = data.get("backendId") or ""
frontend = data.get("frontendId") or ""
if backend == "nae7q-yaaaa-aaaai-atnvq-cai" or frontend == "nae7q-yaaaa-aaaai-atnvq-cai":
    raise SystemExit("refusing to publish Caffeine canister id")
if backend != "5z2v5-uqaaa-aaaao-bbeaq-cai" or frontend != "5xyyv-paaaa-aaaao-bbebq-cai":
    raise SystemExit(f"refusing unpinned ids {backend} {frontend}")
print("health ids ok", backend, frontend)
PY

TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN required}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --depth 1 "https://x-access-token:${TOKEN}@github.com/${REPO}.git" "$WORK/repo"
cd "$WORK/repo"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git checkout --orphan cycles-health-tmp
git rm -rf . >/dev/null 2>&1 || true
mkdir -p ops
cp "$SRC" ops/cycles-health.json
cat > README.md <<'EOF'
# Dfx store cycles health (DDR-044)

Public snapshot for Admin remaining-time clocks. JSON only — no wasm, secrets, or Caffeine IDs.
Updated by **Store cycles sentinel**. Do not merge this branch into `main`.
EOF
git add ops/cycles-health.json README.md
git commit -m "chore(cycles): refresh dfx store health snapshot"
git push --force origin HEAD:cycles-health
echo "published origin/cycles-health"
