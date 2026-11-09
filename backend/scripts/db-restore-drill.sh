#!/usr/bin/env bash
# Restore a verified backup into a SEPARATE test/staging database (never the source DB).
# Usage:
#   RESTORE_DATABASE_NAME=high_school_db_backup_drill npm run db:restore:drill -- [/path/to/file.sql.gz]
# Env:
#   RESTORE_DATABASE_NAME     required (must differ from DATABASE_NAME)
#   RESTORE_CLEANUP=1         drop the drill database after successful verification
#   SKIP_PRISMA_CHECK=1       skip migrate status against the drill DB
#   BACKUP_ADMIN_USER / BACKUP_ADMIN_PASSWORD
#       Optional privileged MySQL user that can CREATE the drill DB and GRANT access
#       to DATABASE_USER. Prefer a local admin for drills; never log these values.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/db-backup-common.sh"

BACKEND_ROOT="$(db_backup_backend_root)"
db_backup_require_tools
db_backup_load_env "$BACKEND_ROOT"

RESTORE_DATABASE_NAME="${RESTORE_DATABASE_NAME:-}"
if [[ -z "$RESTORE_DATABASE_NAME" ]]; then
  echo "error: set RESTORE_DATABASE_NAME to a dedicated drill database name." >&2
  echo "       Example: RESTORE_DATABASE_NAME=high_school_db_backup_drill" >&2
  exit 1
fi

if [[ "$RESTORE_DATABASE_NAME" == "$DATABASE_NAME" ]]; then
  echo "error: refusing to restore into the source database ($DATABASE_NAME)." >&2
  echo "       Choose a different RESTORE_DATABASE_NAME." >&2
  exit 1
fi

case "$RESTORE_DATABASE_NAME" in
  *prod*|*production*)
    if [[ "${ALLOW_PRODUCTION_NAMED_DRILL:-}" != "1" ]]; then
      echo "error: RESTORE_DATABASE_NAME looks production-related. Refusing." >&2
      echo "       Set ALLOW_PRODUCTION_NAMED_DRILL=1 only for an intentional staging name." >&2
      exit 1
    fi
    ;;
esac

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

echo "=== Backup integrity check ==="
"$SCRIPT_DIR/db-backup-verify.sh" "$TARGET"

write_defaults() {
  local user="$1"
  local pass="$2"
  local tmp
  tmp="$(mktemp)"
  chmod 600 "$tmp"
  cat >"$tmp" <<EOF
[client]
host=${DATABASE_HOST}
port=${DATABASE_PORT}
user=${user}
password=${pass}
EOF
  printf '%s\n' "$tmp"
}

APP_DEFAULTS="$(write_defaults "$DATABASE_USER" "$DATABASE_PASSWORD")"
ADMIN_DEFAULTS=""
cleanup() {
  rm -f "$APP_DEFAULTS"
  [[ -n "$ADMIN_DEFAULTS" ]] && rm -f "$ADMIN_DEFAULTS"
}
trap cleanup EXIT

SOURCE_TABLES="$(mysql --defaults-extra-file="$APP_DEFAULTS" -N -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DATABASE_NAME}' AND table_type='BASE TABLE';")"

echo
echo "=== Restore drill ==="
echo "Source DB (untouched): $DATABASE_NAME ($SOURCE_TABLES base tables)"
echo "Target drill DB:       $RESTORE_DATABASE_NAME"
echo "Backup file:           $TARGET"

PRIV_DEFAULTS="$APP_DEFAULTS"
if [[ -n "${BACKUP_ADMIN_USER:-}" ]]; then
  echo "Using BACKUP_ADMIN_USER to prepare drill database privileges."
  ADMIN_DEFAULTS="$(write_defaults "$BACKUP_ADMIN_USER" "${BACKUP_ADMIN_PASSWORD:-}")"
  PRIV_DEFAULTS="$ADMIN_DEFAULTS"
  mysql --defaults-extra-file="$ADMIN_DEFAULTS" -e \
    "CREATE DATABASE IF NOT EXISTS \`${RESTORE_DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     GRANT ALL PRIVILEGES ON \`${RESTORE_DATABASE_NAME}\`.* TO '${DATABASE_USER}'@'%';
     GRANT ALL PRIVILEGES ON \`${RESTORE_DATABASE_NAME}\`.* TO '${DATABASE_USER}'@'localhost';
     FLUSH PRIVILEGES;"
else
  mysql --defaults-extra-file="$APP_DEFAULTS" -e \
    "CREATE DATABASE IF NOT EXISTS \`${RESTORE_DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
    || true
fi

# Drop and recreate the drill DB so the import is a clean restore (never touches source).
if [[ -n "${BACKUP_ADMIN_USER:-}" && -n "$ADMIN_DEFAULTS" ]]; then
  mysql --defaults-extra-file="$ADMIN_DEFAULTS" -e \
    "DROP DATABASE IF EXISTS \`${RESTORE_DATABASE_NAME}\`;
     CREATE DATABASE \`${RESTORE_DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     GRANT ALL PRIVILEGES ON \`${RESTORE_DATABASE_NAME}\`.* TO '${DATABASE_USER}'@'localhost';
     GRANT ALL PRIVILEGES ON \`${RESTORE_DATABASE_NAME}\`.* TO '${DATABASE_USER}'@'%';
     FLUSH PRIVILEGES;"
else
  mysql --defaults-extra-file="$APP_DEFAULTS" -e \
    "DROP DATABASE IF EXISTS \`${RESTORE_DATABASE_NAME}\`;
     CREATE DATABASE \`${RESTORE_DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi

# Require DML/DDL on the drill DB (global CREATE alone is not enough to INSERT rows).
if ! mysql --defaults-extra-file="$APP_DEFAULTS" -e \
  "USE \`${RESTORE_DATABASE_NAME}\`;
   CREATE TABLE _backup_drill_probe (id INT PRIMARY KEY);
   INSERT INTO _backup_drill_probe (id) VALUES (1);
   ALTER TABLE _backup_drill_probe ADD COLUMN note VARCHAR(8) NULL;
   DROP TABLE _backup_drill_probe;" >/dev/null 2>&1; then
  echo "error: application user lacks full privileges on \`${RESTORE_DATABASE_NAME}\`." >&2
  echo "       Global CREATE/DROP is not sufficient for restore (INSERT/ALTER required)." >&2
  echo "       One-time DBA fix (example):" >&2
  echo "         sudo mysql < backend/scripts/sql/grant-backup-drill-db.sql" >&2
  echo "       Or re-run with BACKUP_ADMIN_USER / BACKUP_ADMIN_PASSWORD set." >&2
  exit 2
fi

echo "Importing logical dump into drill database..."
if ! gzip -dc "$TARGET" \
  | sed -e "s/\`${DATABASE_NAME}\`/\`${RESTORE_DATABASE_NAME}\`/g" \
        -e "s/DATABASE ${DATABASE_NAME}/DATABASE ${RESTORE_DATABASE_NAME}/g" \
  | mysql --defaults-extra-file="$APP_DEFAULTS"; then
  echo "error: restore import failed." >&2
  exit 1
fi

RESTORED_TABLES="$(mysql --defaults-extra-file="$APP_DEFAULTS" -N -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${RESTORE_DATABASE_NAME}' AND table_type='BASE TABLE';")"

echo "Restored base tables: $RESTORED_TABLES"

if [[ "$RESTORED_TABLES" -lt 1 ]]; then
  echo "FAIL: restored database has no tables"
  exit 1
fi

if [[ "$RESTORED_TABLES" -ne "$SOURCE_TABLES" ]]; then
  echo "WARN: table count differs from source (source=$SOURCE_TABLES restored=$RESTORED_TABLES)"
else
  echo "OK: table count matches source ($SOURCE_TABLES)"
fi

echo
echo "=== Relationship / critical data spot checks ==="

check_table() {
  local table="$1"
  local count
  count="$(mysql --defaults-extra-file="$APP_DEFAULTS" -N -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${RESTORE_DATABASE_NAME}' AND table_name='${table}';")"
  if [[ "$count" == "1" ]]; then
    local rows
    rows="$(mysql --defaults-extra-file="$APP_DEFAULTS" -N -e \
      "SELECT COUNT(*) FROM \`${RESTORE_DATABASE_NAME}\`.\`${table}\`;")"
    echo "OK: table ${table} present (rows=${rows})"
  else
    echo "FAIL: expected table missing: ${table}"
    return 1
  fi
}

FAILS=0
for t in \
  _prisma_migrations \
  admins \
  roles \
  teachers \
  students \
  enrollments \
  class_offerings \
  teaching_assignments \
  conversations \
  conversation_participants \
  messages \
  notifications
do
  if ! check_table "$t"; then
    FAILS=$((FAILS + 1))
  fi
done

FK_OK="$(mysql --defaults-extra-file="$APP_DEFAULTS" -N -e \
  "SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
   WHERE TABLE_SCHEMA='${RESTORE_DATABASE_NAME}'
     AND TABLE_NAME='enrollments'
     AND REFERENCED_TABLE_NAME='students';")"
if [[ "$FK_OK" -gt 0 ]]; then
  echo "OK: enrollments→students foreign key present"
else
  echo "WARN: enrollments→students FK not found in information_schema"
fi

MIGRATION_ROWS="$(mysql --defaults-extra-file="$APP_DEFAULTS" -N -e \
  "SELECT COUNT(*) FROM \`${RESTORE_DATABASE_NAME}\`.\`_prisma_migrations\`;")"
echo "OK: _prisma_migrations rows=${MIGRATION_ROWS}"

echo
echo "=== Prisma compatibility ==="
npx --yes prisma validate --schema "$BACKEND_ROOT/prisma/schema.prisma" >/dev/null
echo "OK: prisma validate (schema)"

if [[ "${SKIP_PRISMA_CHECK:-}" != "1" ]]; then
  ENC_PASS="$(python3 - <<'PY' "$DATABASE_PASSWORD"
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=''))
PY
)"
  DRILL_URL="mysql://${DATABASE_USER}:${ENC_PASS}@${DATABASE_HOST}:${DATABASE_PORT}/${RESTORE_DATABASE_NAME}"
  if DATABASE_URL="$DRILL_URL" npx --yes prisma migrate status --schema "$BACKEND_ROOT/prisma/schema.prisma" \
      >/tmp/abyssinia-prisma-migrate-status.out 2>&1; then
    echo "OK: prisma migrate status against drill database"
    grep -E 'Database schema is up to date|migrations? found|Following migration|Have been applied|not yet been applied' \
      /tmp/abyssinia-prisma-migrate-status.out || true
  else
    echo "WARN: prisma migrate status reported an issue (filtered output below)"
    grep -E 'Database schema|migrations? found|Following migration|Have been applied|not yet been applied|Error|error' \
      /tmp/abyssinia-prisma-migrate-status.out || true
  fi
  rm -f /tmp/abyssinia-prisma-migrate-status.out
  unset DRILL_URL ENC_PASS
fi

# Silence unused warning when admin path unused beyond privilege prep
: "${PRIV_DEFAULTS}"

if [[ "$FAILS" -gt 0 ]]; then
  echo
  echo "RESULT: RESTORE DRILL FAILED ($FAILS critical table check(s) failed)"
  exit 1
fi

if [[ "${RESTORE_CLEANUP:-}" == "1" ]]; then
  echo
  echo "Cleaning up drill database: $RESTORE_DATABASE_NAME"
  if [[ -n "${BACKUP_ADMIN_USER:-}" && -n "$ADMIN_DEFAULTS" ]]; then
    mysql --defaults-extra-file="$ADMIN_DEFAULTS" -e "DROP DATABASE IF EXISTS \`${RESTORE_DATABASE_NAME}\`;"
  else
    mysql --defaults-extra-file="$APP_DEFAULTS" -e "DROP DATABASE IF EXISTS \`${RESTORE_DATABASE_NAME}\`;"
  fi
  echo "OK: drill database dropped"
else
  echo
  echo "Drill database retained for inspection: $RESTORE_DATABASE_NAME"
fi

echo
echo "RESULT: RESTORE DRILL PASSED"
echo "Source database $DATABASE_NAME was not modified."
