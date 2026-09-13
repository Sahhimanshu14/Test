#!/usr/bin/env bash
# ==============================================================================
# CDSPrep — Production PostgreSQL Backup Automation Script
#
# Usage:
#   ./scripts/db-backup.sh [BACKUP_DIR]
#
# Requirements:
#   - postgresql-client (pg_dump)
#   - gzip, sha256sum
#   - DATABASE_URL or standard PG environment variables configured
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups/postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/cdsprep_backup_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "${BACKUP_DIR}"

echo "=========================================================="
echo " Starting CDSPrep Production Database Backup"
echo " Timestamp : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo " Destination: ${BACKUP_FILE}"
echo "=========================================================="

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not defined."
  echo "   Please source your .env.production file before running."
  exit 1
fi

# Execute pg_dump with custom format or gzipped plain SQL
echo "📦 Exporting relational schema, tables, and data..."
pg_dump "${DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --verbose \
  --file="${BACKUP_DIR}/cdsprep_backup_${TIMESTAMP}.dump"

# Also generate gzipped plain SQL dump for portability
pg_dump "${DATABASE_URL}" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists | gzip -9 > "${BACKUP_FILE}"

# Compute SHA256 integrity checksum
echo "🔒 Computing SHA256 integrity checksum..."
sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup completed successfully!"
echo "   File size: ${BACKUP_SIZE}"
echo "   Checksum : $(cat "${CHECKSUM_FILE}")"

# Prune old backups exceeding retention policy
echo "🧹 Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "cdsprep_backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete || true
find "${BACKUP_DIR}" -name "cdsprep_backup_*.dump" -mtime "+${RETENTION_DAYS}" -delete || true
find "${BACKUP_DIR}" -name "cdsprep_backup_*.sha256" -mtime "+${RETENTION_DAYS}" -delete || true

echo "🎉 Database backup process finished successfully."
