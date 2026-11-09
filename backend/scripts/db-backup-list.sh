#!/usr/bin/env bash
# List available application-managed database backups.
# Usage: npm run db:backup:list

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/db-backup-common.sh"

BACKEND_ROOT="$(db_backup_backend_root)"
db_backup_load_env "$BACKEND_ROOT"

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "No backup directory yet: $BACKUP_DIR"
  exit 0
fi

echo "Backup directory: $BACKUP_DIR"
echo

shopt -s nullglob
files=("$BACKUP_DIR"/"${BACKUP_PREFIX}"_*.sql.gz)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "(no backups found)"
  exit 0
fi

printf '%-56s %12s %10s %s\n' "FILE" "BYTES" "TABLES" "SHA256"
printf '%s\n' "--------------------------------------------------------------------------------------------------------------"

for f in "${files[@]}"; do
  base="$(basename "$f")"
  bytes="$(wc -c <"$f" | tr -d ' ')"
  tables="?"
  if [[ -f "${f}.meta.json" ]]; then
    tables="$(grep -o '"createTableCount": [0-9]*' "${f}.meta.json" | awk '{print $2}')"
  fi
  sha="missing"
  if [[ -f "${f}.sha256" ]]; then
    sha="$(awk '{print $1}' "${f}.sha256")"
  fi
  printf '%-56s %12s %10s %s\n' "$base" "$bytes" "$tables" "$sha"
done
