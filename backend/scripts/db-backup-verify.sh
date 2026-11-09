#!/usr/bin/env bash
# Verify backup integrity (size, gzip, checksum, dump structure).
# Usage: npm run db:backup:verify -- /path/to/file.sql.gz
#        npm run db:backup:verify                 # verifies newest backup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/db-backup-common.sh"

BACKEND_ROOT="$(db_backup_backend_root)"
db_backup_require_tools
db_backup_load_env "$BACKEND_ROOT"

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  shopt -s nullglob
  candidates=("$BACKUP_DIR"/"${BACKUP_PREFIX}"_*.sql.gz)
  if [[ ${#candidates[@]} -eq 0 ]]; then
    echo "error: no backups found in $BACKUP_DIR" >&2
    exit 1
  fi
  TARGET="$(ls -1t "${candidates[@]}" | head -n1)"
fi

if [[ ! -f "$TARGET" ]]; then
  echo "error: backup file not found: $TARGET" >&2
  exit 1
fi

echo "Verifying: $TARGET"
ERRORS=0

if [[ ! -s "$TARGET" ]]; then
  echo "FAIL: file is empty"
  ERRORS=$((ERRORS + 1))
else
  BYTES="$(wc -c <"$TARGET" | tr -d ' ')"
  echo "OK: non-empty ($BYTES bytes)"
fi

if gzip -t "$TARGET" 2>/dev/null; then
  echo "OK: gzip integrity"
else
  echo "FAIL: gzip integrity check failed"
  ERRORS=$((ERRORS + 1))
fi

SHA_FILE="${TARGET}.sha256"
if [[ -f "$SHA_FILE" ]]; then
  if (cd "$(dirname "$TARGET")" && sha256sum -c "$(basename "$SHA_FILE")" >/dev/null 2>&1); then
    echo "OK: sha256 matches sidecar"
  else
    echo "FAIL: sha256 mismatch"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "WARN: no .sha256 sidecar (computing hash only)"
  sha256sum "$TARGET" | awk '{print "INFO: sha256="$1}'
fi

# Structural checks on decompressed SQL (stream; do not write plaintext dump to disk).
# Use `|| true` on early-closing pipes so SIGPIPE from gzip does not fail the check.
HEADER_SNIP="$(gzip -dc "$TARGET" | head -n 50 || true)"
if printf '%s\n' "$HEADER_SNIP" | grep -q 'MySQL dump'; then
  echo "OK: MySQL dump header present"
else
  echo "FAIL: MySQL dump header not found"
  ERRORS=$((ERRORS + 1))
fi

CREATE_COUNT="$(gzip -dc "$TARGET" | grep -c '^CREATE TABLE' || true)"
if [[ "$CREATE_COUNT" -gt 0 ]]; then
  echo "OK: CREATE TABLE statements found ($CREATE_COUNT)"
else
  echo "FAIL: no CREATE TABLE statements in dump"
  ERRORS=$((ERRORS + 1))
fi

PRISMA_HITS="$(gzip -dc "$TARGET" | grep -c '_prisma_migrations' || true)"
if [[ "$PRISMA_HITS" -gt 0 ]]; then
  echo "OK: _prisma_migrations referenced in dump ($PRISMA_HITS hits)"
else
  echo "WARN: _prisma_migrations not found in dump text (unexpected for this project)"
fi

if [[ "$ERRORS" -gt 0 ]]; then
  echo "RESULT: INVALID ($ERRORS check(s) failed)"
  exit 1
fi

echo "RESULT: VALID"
exit 0
