#!/usr/bin/env bash
# setup-dfx-ci-secret.sh — create/export a dedicated dfx CI identity and upload
# DFX_IDENTITY_PEM to GitHub Actions secrets for janussanders/bamm-dfx-web-store.
#
# Safe layout:
#   .secrets/dfx-ci-identity.pem   (gitignored — never committed; only for gh upload)
#   ~/.config/dfx/identity/<name>/ (keyring or password-protected — NOT plaintext)
#
# Does not run during mops/pnpm/dfx build. Manual operator tool only.
#
# Usage:
#   ./scripts/setup-dfx-ci-secret.sh                 # export default CI name (bamm-dfx-ci)
#   ./scripts/setup-dfx-ci-secret.sh --identity NAME # use an existing funded identity
#   DFX_CI_IDENTITY_NAME=myid ./scripts/setup-dfx-ci-secret.sh
#   ./scripts/setup-dfx-ci-secret.sh --upload-only   # PEM already in .secrets/
#   ./scripts/setup-dfx-ci-secret.sh --print-principal
#   ./scripts/setup-dfx-ci-secret.sh --identity NAME --print-principal
#
# Storage: prefers macOS keyring. Set DFX_CI_STORAGE_MODE=password-protected if needed.
# Never use plaintext for local identities (security warning / identity.json risk).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IDENTITY_NAME="${DFX_CI_IDENTITY_NAME:-bamm-dfx-ci}"
STORAGE_MODE="${DFX_CI_STORAGE_MODE:-keyring}"
SECRETS_DIR="$ROOT/.secrets"
PEM_PATH="$SECRETS_DIR/dfx-ci-identity.pem"
GH_SECRET_NAME="DFX_IDENTITY_PEM"
GH_REPO="${GH_REPO:-janussanders/bamm-dfx-web-store}"

UPLOAD_ONLY=0
PRINT_PRINCIPAL=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --upload-only) UPLOAD_ONLY=1; shift ;;
    --print-principal) PRINT_PRINCIPAL=1; shift ;;
    --identity)
      IDENTITY_NAME="${2:?--identity requires a name}"
      shift 2
      ;;
    -h|--help)
      sed -n '1,30p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need gh
need dfx

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

case "$STORAGE_MODE" in
  keyring|password-protected) ;;
  plaintext)
    echo "Refusing STORAGE_MODE=plaintext (security risk). Use keyring or password-protected." >&2
    exit 1
    ;;
  *)
    echo "Invalid DFX_CI_STORAGE_MODE=$STORAGE_MODE (use keyring or password-protected)" >&2
    exit 1
    ;;
esac

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR" 2>/dev/null || true

# Ensure .secrets stays out of git (belt + suspenders with .gitignore)
if [[ ! -f "$SECRETS_DIR/.gitignore" ]]; then
  printf '*\n!.gitignore\n' > "$SECRETS_DIR/.gitignore"
fi

if [[ "$UPLOAD_ONLY" -eq 0 ]]; then
  if dfx identity list 2>/dev/null | grep -qx "$IDENTITY_NAME"; then
    echo "Using existing dfx identity: $IDENTITY_NAME"
  else
    echo "Creating dfx identity: $IDENTITY_NAME (storage-mode=$STORAGE_MODE)"
    dfx identity new "$IDENTITY_NAME" --storage-mode="$STORAGE_MODE"
  fi

  echo "Exporting PEM → $PEM_PATH (gitignored; for GitHub secret only)"
  dfx identity export "$IDENTITY_NAME" > "$PEM_PATH"
  chmod 600 "$PEM_PATH"
else
  if [[ ! -f "$PEM_PATH" ]]; then
    echo "Missing $PEM_PATH (required for --upload-only)" >&2
    exit 1
  fi
fi

PRINCIPAL="$(dfx identity get-principal --identity "$IDENTITY_NAME" 2>/dev/null || true)"
if [[ -z "$PRINCIPAL" ]]; then
  PRINCIPAL="$(dfx identity use "$IDENTITY_NAME" >/dev/null; dfx identity get-principal)"
fi

echo "CI identity principal: $PRINCIPAL"

if [[ "$PRINT_PRINCIPAL" -eq 1 ]]; then
  exit 0
fi

echo "Uploading GitHub Actions secret $GH_SECRET_NAME → $GH_REPO"
gh secret set "$GH_SECRET_NAME" --repo "$GH_REPO" < "$PEM_PATH"

echo
echo "Done."
echo "  Local PEM (gitignored): $PEM_PATH"
echo "  GitHub secret:          $GH_SECRET_NAME on $GH_REPO"
echo "  Principal:              $PRINCIPAL"
echo
echo "Next: fund this identity with cycles on IC, then run Actions → Deploy dfx (IC) with deploy=true."
echo "See: docs/dfx-ci-identity.md"
