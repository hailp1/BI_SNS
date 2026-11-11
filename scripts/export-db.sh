#!/usr/bin/env bash
# Export PostgreSQL database to backups/cj_enterprise_latest.dump and sync to Google Drive (if configured).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

ensure_env_file
detect_compose

mkdir -p backups
OUT_FILE="backups/cj_enterprise_latest.dump"
TMP_OUT="${OUT_FILE}.tmp"
SYNC_TARGET="${1:-}"

echo "====================================================================="
echo "  CJ ENTERPRISE SNS - XUAT DATABASE POSTGRESQL (.DUMP NEN) [UBUNTU]"
echo "====================================================================="

if ! docker ps --filter "name=standard_postgres" --filter "status=running" --format "{{.Names}}" | grep -qx "standard_postgres"; then
  echo "[ERROR] Container standard_postgres chua chay. Hay chay: ${COMPOSE_CMD[*]} up -d" >&2
  exit 1
fi

echo "[*] Dang xuat database \"${DB_NAME}\" bang pg_dump -Fc ..."
docker exec standard_postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f /tmp/cj_enterprise_export.dump
docker cp standard_postgres:/tmp/cj_enterprise_export.dump "$TMP_OUT"
docker exec standard_postgres rm -f /tmp/cj_enterprise_export.dump >/dev/null 2>&1 || true
mv -f "$TMP_OUT" "$OUT_FILE"

DUMP_BYTES="$(wc -c < "$OUT_FILE" | tr -d ' ')"
echo "[OK] Da xuat thanh cong: ${PROJECT_ROOT}/${OUT_FILE} (${DUMP_BYTES} bytes)"

if [[ -n "$SYNC_TARGET" ]]; then
  mkdir -p "$SYNC_TARGET"
  cp -f "$OUT_FILE" "${SYNC_TARGET}/cj_enterprise_latest.dump"
  [[ -f "web_app/apps/routemap/dms_data.js" ]] && cp -f "web_app/apps/routemap/dms_data.js" "${SYNC_TARGET}/dms_data.js"
  echo "[OK] Da copy vao thu muc sync: ${SYNC_TARGET}"
elif RCLONE_REMOTE="$(detect_rclone_drive_remote)"; then
  echo "[*] Phat hien rclone Google Drive (${RCLONE_REMOTE}) -> dang upload len ${RCLONE_REMOTE}BI_SNS_Sync ..."
  rclone copy "$OUT_FILE" "${RCLONE_REMOTE}BI_SNS_Sync" --progress
  if [[ -f "web_app/apps/routemap/dms_data.js" ]]; then
    rclone copy "web_app/apps/routemap/dms_data.js" "${RCLONE_REMOTE}BI_SNS_Sync" --progress
  fi
  echo "[OK] Da dong bo len Google Drive qua rclone (${RCLONE_REMOTE}BI_SNS_Sync)"
else
  echo "[INFO] Chua cau hinh rclone Google Drive. File dump da luu tai: ${PROJECT_ROOT}/${OUT_FILE}"
  echo "       Ban co the cai rclone (sudo apt install rclone && rclone config) hoac upload thu cong len thu muc BI_SNS_Sync."
fi
