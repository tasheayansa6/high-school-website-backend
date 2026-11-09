#!/usr/bin/env bash
# Create a timestamped logical MySQL backup (mysqldump + gzip) outside the repo.
# Usage: npm run db:backup
# Optional: BACKUP_DIR, BACKUP_RETENTION_DAYS, BACKUP_PREFIX, BACKUP_ENV_FILE

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/db-backup-common.sh"

BACKEND_ROOT="$(db_backup_backend_root)"
db_backup_require_tools
db_backup_load_env "$BACKEND_ROOT"
db_backup_assert_outside_repo "$BACKEND_ROOT" "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BASENAME="${BACKUP_PREFIX}_${DATABASE_NAME}_${STAMP}.sql.gz"
OUT_FILE="$BACKUP_DIR/$BASENAME"
SHA_FILE="${OUT_FILE}.sha256"
META_FILE="${OUT_FILE}.meta.json"
DEFAULTS="$(db_backup_write_defaults_file)"
trap 'rm -f "$DEFAULTS"' EXIT

echo "Creating logical backup of $(db_backup_safe_label)"
echo "Output directory: $BACKUP_DIR"

# Consistent InnoDB snapshot; include routines/triggers.
# --no-tablespaces avoids requiring PROCESS privilege on restricted app users.
mysqldump \
  --defaults-extra-file="$DEFAULTS" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --no-tablespaces \
  --skip-add-locks \
  --skip-disable-keys \
  --default-character-set=utf8mb4 \
  --set-gtid-purged=OFF \
  --databases "$DATABASE_NAME" \
  | gzip -c >"$OUT_FILE"
dump_status=${PIPESTATUS[0]}
if [[ "$dump_status" -ne 0 ]]; then
  echo "error: mysqldump failed with exit code $dump_status" >&2
  rm -f "$OUT_FILE"
  exit "$dump_status"
fi

if [[ ! -s "$OUT_FILE" ]]; then
  echo "error: backup file is empty: $OUT_FILE" >&2
  rm -f "$OUT_FILE"
  exit 1
fi

# Integrity sidecar (hash of the compressed file).
(
  cd "$BACKUP_DIR"
  sha256sum "$(basename "$OUT_FILE")" >"$(basename "$SHA_FILE")"
)

BYTES="$(wc -c <"$OUT_FILE" | tr -d ' ')"
TABLE_HINT="$(gzip -dc "$OUT_FILE" | grep -c '^CREATE TABLE' || true)"

cat >"$META_FILE" <<EOF
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "sourceDatabase": "$DATABASE_NAME",
  "sourceHost": "$DATABASE_HOST",
  "sourcePort": $DATABASE_PORT,
  "fileName": "$BASENAME",
  "bytes": $BYTES,
  "createTableCount": $TABLE_HINT,
  "tool": "mysqldump+gzip",
  "format": "sql.gz"
}
EOF

echo "Backup created: $BASENAME ($BYTES bytes, ~$TABLE_HINT CREATE TABLE statements)"

# Retention prune (files matching prefix older than retention days).
if [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$BACKUP_RETENTION_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -type f -name "${BACKUP_PREFIX}_*.sql.gz*" -mtime +"$BACKUP_RETENTION_DAYS" -print -delete \
    | sed 's/^/Pruned expired: /' || true
fi

echo "Done."
echo "$OUT_FILE"
