#!/usr/bin/env bash
# Shared helpers for MySQL logical backup / restore drills.
# Never prints passwords, DATABASE_URL, or connection strings.

set -euo pipefail

# Captured when this file is sourced (path of lib/), not when helpers are called.
_DB_BACKUP_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

db_backup_backend_root() {
  # lib/ → scripts/ → backend/
  cd "$_DB_BACKUP_LIB_DIR/../.." && pwd
}

db_backup_load_env() {
  local backend_root="$1"
  local env_file="${BACKUP_ENV_FILE:-$backend_root/.env}"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi

  DATABASE_HOST="${DATABASE_HOST:-127.0.0.1}"
  DATABASE_PORT="${DATABASE_PORT:-3306}"
  DATABASE_USER="${DATABASE_USER:-}"
  DATABASE_PASSWORD="${DATABASE_PASSWORD:-}"
  DATABASE_NAME="${DATABASE_NAME:-}"

  if [[ -z "$DATABASE_USER" || -z "$DATABASE_NAME" ]]; then
    echo "error: DATABASE_USER and DATABASE_NAME must be set (via .env or environment)." >&2
    exit 1
  fi

  # Default backup directory is a sibling of the git repository (never inside it).
  local default_backup_dir
  default_backup_dir="$(cd "$backend_root/../.." && pwd)/abyssinia-academy-db-backups"
  BACKUP_DIR="${BACKUP_DIR:-$default_backup_dir}"
  BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
  BACKUP_PREFIX="${BACKUP_PREFIX:-abyssinia-academy}"
}

db_backup_assert_outside_repo() {
  local backend_root="$1"
  local target="$2"
  local repo_root
  repo_root="$(cd "$backend_root/.." && pwd)"
  mkdir -p "$target"
  local resolved
  resolved="$(cd "$target" && pwd)"
  case "$resolved" in
    "$repo_root"|"$repo_root"/*)
      echo "error: BACKUP_DIR must not be inside the git repository ($repo_root)." >&2
      echo "       Refusing path: $resolved" >&2
      exit 1
      ;;
  esac
}

# Write a short-lived MySQL defaults file so credentials are not passed on argv.
db_backup_write_defaults_file() {
  local tmp
  tmp="$(mktemp)"
  chmod 600 "$tmp"
  cat >"$tmp" <<EOF
[client]
host=${DATABASE_HOST}
port=${DATABASE_PORT}
user=${DATABASE_USER}
password=${DATABASE_PASSWORD}
EOF
  printf '%s\n' "$tmp"
}

db_backup_require_tools() {
  local tool
  for tool in mysqldump mysql gzip sha256sum; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "error: required tool not found: $tool" >&2
      exit 1
    fi
  done
}

db_backup_safe_label() {
  # Host/db name only — never credentials.
  printf '%s@%s:%s/%s\n' "$DATABASE_USER" "$DATABASE_HOST" "$DATABASE_PORT" "$DATABASE_NAME"
}
