#!/usr/bin/env bash
# Shared helpers for Ubuntu/Linux DB export & restore scripts.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ensure_env_file() {
  if [[ ! -f ".env" && -f ".env.example" ]]; then
    echo "[*] Chua co file .env -> tao tu dong tu .env.example..."
    cp ".env.example" ".env"
    if command -v openssl >/dev/null 2>&1; then
      local pg_pass redis_pass jwt_secret payload_key
      pg_pass="$(openssl rand -hex 16)"
      redis_pass="$(openssl rand -hex 16)"
      jwt_secret="$(openssl rand -hex 32)"
      payload_key="$(openssl rand -hex 32)"
      sed -i \
        -e "s|CHANGE_ME_STRONG_DB_PASSWORD|${pg_pass}|g" \
        -e "s|CHANGE_ME_STRONG_REDIS_PASSWORD|${redis_pass}|g" \
        -e "s|CHANGE_ME_AT_LEAST_64_HEX_CHARS_RANDOM_SECRET|${jwt_secret}|g" \
        -e "s|CHANGE_ME_64_HEX_CHARS_PAYLOAD_DECRYPTION_KEY|${payload_key}|g" \
        ".env"
    fi
  fi

  DB_USER="cj_sec_admin"
  DB_NAME="cj_enterprise_db"
  REDIS_PASS=""

  if [[ -f ".env" ]]; then
    local val
    val="$(grep -E '^POSTGRES_USER=' .env | tail -n 1 | cut -d= -f2- | tr -d '\r' || true)"
    [[ -n "$val" ]] && DB_USER="$val"
    val="$(grep -E '^POSTGRES_DB=' .env | tail -n 1 | cut -d= -f2- | tr -d '\r' || true)"
    [[ -n "$val" ]] && DB_NAME="$val"
    val="$(grep -E '^REDIS_PASSWORD=' .env | tail -n 1 | cut -d= -f2- | tr -d '\r' || true)"
    [[ -n "$val" ]] && REDIS_PASS="$val"
  fi
}

detect_compose() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[ERROR] Chua cai Docker. Hay cai Docker Engine + Docker Compose v2 truoc." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Khong ket noi duoc Docker daemon." >&2
    echo "        Neu bi loi permission tren Ubuntu, hay chay: sudo usermod -aG docker \$USER && newgrp docker" >&2
    exit 1
  fi
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    echo "[ERROR] Khong tim thay 'docker compose' hoac 'docker-compose'." >&2
    exit 1
  fi
}

wait_for_postgres() {
  local retries=30
  local i=1
  while (( i <= retries )); do
    if docker exec standard_postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    ((i++))
  done
  echo "[ERROR] PostgreSQL trong container standard_postgres chua san sang sau ${retries}s." >&2
  return 1
}

detect_rclone_drive_remote() {
  command -v rclone >/dev/null 2>&1 || return 1
  local remote
  remote="$(rclone listremotes --long 2>/dev/null | awk '$2 == "drive" {print $1; exit}' || true)"
  [[ -n "$remote" ]] || return 1
  printf '%s' "$remote"
}

find_gdrive_folder_id() {
  local folder_name="$1"
  command -v gdrive >/dev/null 2>&1 || return 1
  command -v python3 >/dev/null 2>&1 || return 1
  gdrive auth status >/dev/null 2>&1 || return 1
  local json_out
  json_out="$(gdrive readonly search --name-contains "$folder_name" --json 2>/dev/null || true)"
  [[ -n "$json_out" ]] || return 1
  python3 - "$folder_name" "$json_out" <<'PY'
import json, sys
target = sys.argv[1]
data = json.loads(sys.argv[2])
files = data if isinstance(data, list) else data.get("files", [])
for f in files:
    if f.get("name") == target and f.get("mimeType") == "application/vnd.google-apps.folder":
        print(f["id"])
        sys.exit(0)
sys.exit(1)
PY
}
