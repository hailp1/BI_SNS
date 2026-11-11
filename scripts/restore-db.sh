#!/usr/bin/env bash
# Restore PostgreSQL database on Ubuntu from local .dump or sync automatically from Google Drive (BI_SNS_Sync).
# Usage:
#   ./scripts/restore-db.sh                  # Auto-find .dump locally or download from Drive if missing
#   ./scripts/restore-db.sh --sync           # Force pull latest BI_SNS_Sync from Google Drive first
#   ./scripts/restore-db.sh /path/to/file.dump

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

FORCE_SYNC=0
ARG_DUMP=""
for arg in "$@"; do
  case "$arg" in
    --sync) FORCE_SYNC=1 ;;
    -h|--help)
      echo "Su dung: $0 [--sync] [duong_dan_file.dump]"
      exit 0
      ;;
    *) ARG_DUMP="$arg" ;;
  esac
done

ensure_env_file
detect_compose
mkdir -p backups

sync_from_google_drive() {
  local folder_name="BI_SNS_Sync"
  local remote folder_id files_json

  if remote="$(detect_rclone_drive_remote)"; then
    echo "[*] Dang tai du lieu tu Google Drive qua rclone (${remote}${folder_name}) ..."
    rclone copy "${remote}${folder_name}" "backups" \
      --include "cj_enterprise_latest.dump" \
      --include "dms_data.js" \
      --progress
    [[ -f "backups/cj_enterprise_latest.dump" ]] && return 0
  fi

  if folder_id="$(find_gdrive_folder_id "$folder_name")"; then
    echo "[*] Dang tai du lieu tu Google Drive qua gdrive CLI (folder ID: ${folder_id}) ..."
    files_json="$(gdrive readonly ls "$folder_id" --json 2>/dev/null || true)"
    if [[ -n "$files_json" ]] && command -v python3 >/dev/null 2>&1; then
      while IFS=$'\t' read -r fid fname; do
        if [[ "$fname" == "cj_enterprise_latest.dump" || "$fname" == "dms_data.js" ]]; then
          echo "    -> Downloading ${fname} (${fid})..."
          gdrive readonly download "$fid" --out "backups/${fname}.tmp"
          mv -f "backups/${fname}.tmp" "backups/${fname}"
        fi
      done < <(python3 - "$files_json" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
files = data if isinstance(data, list) else data.get("files", [])
for f in files:
    print(f"{f['id']}\t{f['name']}")
PY
      )
      [[ -f "backups/cj_enterprise_latest.dump" ]] && return 0
    fi
  fi

  return 1
}

if [[ "$FORCE_SYNC" -eq 1 ]]; then
  if ! sync_from_google_drive; then
    echo "[ERROR] Khong the dong bo tu Google Drive (--sync)." >&2
    echo "        Hay cau hinh rclone (sudo apt install -y rclone && rclone config -> remote ten 'gdrive' loai Drive)" >&2
    echo "        hoac tai thu cong cj_enterprise_latest.dump tu Google Drive/BI_SNS_Sync vao thu muc backups/." >&2
    exit 1
  fi
fi

DUMP_FILE="$ARG_DUMP"
if [[ -z "$DUMP_FILE" ]]; then
  for candidate in \
    "backups/cj_enterprise_latest.dump" \
    "$HOME/BI_SNS_Sync/cj_enterprise_latest.dump" \
    "$HOME/Google Drive/BI_SNS_Sync/cj_enterprise_latest.dump" \
    "$HOME/gdrive/BI_SNS_Sync/cj_enterprise_latest.dump" \
    "$HOME/Downloads/cj_enterprise_latest.dump"; do
    if [[ -f "$candidate" ]]; then
      DUMP_FILE="$candidate"
      break
    fi
  done
fi

if [[ -z "$DUMP_FILE" ]]; then
  echo "[*] Chua thay file .dump cuc bo -> thu tu dong tai tu Google Drive (BI_SNS_Sync)..."
  if sync_from_google_drive && [[ -f "backups/cj_enterprise_latest.dump" ]]; then
    DUMP_FILE="backups/cj_enterprise_latest.dump"
  fi
fi

if [[ -z "$DUMP_FILE" || ! -f "$DUMP_FILE" ]]; then
  echo "[ERROR] Khong tim thay file .dump!" >&2
  echo "Cach 1 (Tu dong qua rclone):" >&2
  echo "  sudo apt update && sudo apt install -y rclone" >&2
  echo "  rclone config   # tao remote Google Drive ten 'gdrive'" >&2
  echo "  ./scripts/restore-db.sh --sync" >&2
  echo "Cach 2 (Tai thu cong tu Google Drive -> thu muc BI_SNS_Sync):" >&2
  echo "  Dat cj_enterprise_latest.dump (va dms_data.js neu co) vao ./backups/ roi chay lai: ./scripts/restore-db.sh" >&2
  exit 1
fi

echo "====================================================================="
echo "  CJ ENTERPRISE SNS - KHOI PHUC DATABASE POSTGRESQL [UBUNTU]"
echo "====================================================================="
echo "[*] File nguon: ${DUMP_FILE}"

DUMP_DIR="$(cd "$(dirname "$DUMP_FILE")" && pwd)"
NEED_NGINX_REBUILD=0
if [[ -f "${DUMP_DIR}/dms_data.js" ]]; then
  if [[ ! -f "web_app/apps/routemap/dms_data.js" ]] || ! cmp -s "${DUMP_DIR}/dms_data.js" "web_app/apps/routemap/dms_data.js"; then
    echo "[*] Phat hien dms_data.js moi -> copy vao web_app/apps/routemap/dms_data.js ..."
    mkdir -p "web_app/apps/routemap"
    cp -f "${DUMP_DIR}/dms_data.js" "web_app/apps/routemap/dms_data.js"
    NEED_NGINX_REBUILD=1
  fi
fi

echo "[1/4] Kiem tra va khoi dong PostgreSQL + Redis..."
"${COMPOSE_CMD[@]}" up -d standard_postgres standard_redis
wait_for_postgres

echo "[2/4] Tam dung standard_backend (neu dang chay) de tranh giu lock DB..."
"${COMPOSE_CMD[@]}" stop standard_backend >/dev/null 2>&1 || true

echo "[3/4] Dang nap file .dump vao PostgreSQL (${DB_NAME})..."
docker cp "$DUMP_FILE" standard_postgres:/tmp/restore.dump

set +e
docker exec standard_postgres pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges /tmp/restore.dump
RESTORE_RC=$?
set -e
docker exec standard_postgres rm -f /tmp/restore.dump >/dev/null 2>&1 || true

if [[ "$RESTORE_RC" -ne 0 ]]; then
  echo "[WARN] pg_restore tra ve ma ${RESTORE_RC} (mot so canh bao DROP khi DB moi co the bo qua neu so lieu ben duoi day du)."
fi

echo "[4/4] Khoi dong lai backend + nginx & xoa cache Redis..."
"${COMPOSE_CMD[@]}" up -d --build standard_backend standard_nginx
if [[ -n "$REDIS_PASS" ]]; then
  docker exec standard_redis redis-cli --no-auth-warning -a "$REDIS_PASS" FLUSHDB >/dev/null 2>&1 || true
fi

echo
echo "[*] Kiem tra so lieu sau khi nap:"
docker exec standard_postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT meta_value AS data_refresh_date FROM datamart.etl_metadata WHERE meta_key='data_refresh_date'; SELECT COUNT(*) AS total_datasets, COALESCE(SUM(row_count),0) AS total_rows FROM datamart.etl_dataset_stats; SELECT COUNT(*) AS total_users FROM iam.users;"

echo
echo "[OK] Hoan tat! Truy cap: http://localhost:8090 (nhan Ctrl+F5 neu trinh duyet da mo truoc do)."
