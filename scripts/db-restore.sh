#!/usr/bin/env bash
# ==============================================================================
# CDSPrep — Production PostgreSQL Restore Automation Script
#
# Usage:
#   ./scripts/db-restore.sh <path_to_backup_file> [TARGET_DATABASE_URL]
#
# Safety:
#   Requires explicit typing of 'RESTORE' to prevent accidental execution.
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file> [TARGET_DATABASE_URL]"
  echo "Example: $0 ./backups/postgres/cdsprep_backup_20260913_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
RESTORE_URL="${2:-${DATABASE_URL:-}}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

if [ -z "${RESTORE_URL}" ]; then
  echo "❌ ERROR: Target DATABASE_URL is not defined."
  exit 1
fi

# Verify SHA256 checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "🔍 Verifying SHA256 checksum against ${CHECKSUM_FILE}..."
  if sha256sum -c "${CHECKSUM_FILE}"; then
    echo "✅ Checksum verified: Archive integrity confirmed."
  else
    echo "❌ FATAL: Checksum mismatch! Archive may be corrupted or tampered."
    exit 1
  fi
fi

echo "⚠️  WARNING: You are about to restore data into the target database."
echo "   Target : ${RESTORE_URL}"
echo "   Source : ${BACKUP_FILE}"
echo "   THIS WILL OVERWRITE EXISTING TABLES AND RECORDS!"
echo ""
read -r -p "Type 'RESTORE' in uppercase to confirm: " CONFIRMATION

if [ "${CONFIRMATION}" != "RESTORE" ]; then
  echo "Aborting restore. No changes were made."
  exit 0
fi

echo "=========================================================="
echo " Starting Database Restoration"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================================="

if [[ "${BACKUP_FILE}" == *.dump ]]; then
  echo "📦 Restoring from PostgreSQL custom archive via pg_restore..."
  pg_restore \
    --dbname="${RESTORE_URL}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    --verbose \
    "${BACKUP_FILE}"
elif [[ "${BACKUP_FILE}" == *.sql.gz ]]; then
  echo "📦 Restoring from gzipped SQL dump via psql..."
  gunzip -c "${BACKUP_FILE}" | psql "${RESTORE_URL}" --single-transaction
elif [[ "${BACKUP_FILE}" == *.sql ]]; then
  echo "📦 Restoring from plain SQL dump via psql..."
  psql "${RESTORE_URL}" --single-transaction -f "${BACKUP_FILE}"
else
  echo "❌ ERROR: Unsupported backup format. Supported: .dump, .sql.gz, .sql"
  exit 1
fi

echo "✅ Database restored successfully!"
