#!/usr/bin/env bash
# ==============================================================================
# CDSPrep — Production Database Migration Runner
#
# Runs Prisma Migrate Deploy in non-interactive production mode.
# Never drops or resets tables; only applies unapplied migrations.
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo " Applying Pending Production Database Migrations"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================================="

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not defined."
  exit 1
fi

# Ensure Prisma client is generated
pnpm --filter @cdsprep/database run db:generate

# Execute production migrations
pnpm --filter @cdsprep/database prisma migrate deploy

echo "✅ Production migrations applied successfully."
