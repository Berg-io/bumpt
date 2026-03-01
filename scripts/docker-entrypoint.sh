#!/bin/sh
set -e

echo "=== bum.pt - Starting ==="

# Community policy: local license key installation is disabled.
# When enabled, ignore LICENSE_KEY so UI/runtime stay Community-only.
if [ "${BUMPT_DISABLE_LICENSE_INSTALL:-true}" = "true" ]; then
  unset LICENSE_KEY
  echo "Community mode: local license activation is disabled."
fi

# ── Validate required secrets in production ──
if [ "$NODE_ENV" = "production" ]; then
  INSECURE=""
  STRICT_ENV_VALIDATION="${STRICT_ENV_VALIDATION:-false}"
  if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "change-this-to-a-secure-random-string-in-production" ] || [ "$JWT_SECRET" = "please-change-this-secret-in-production" ] || [ "$JWT_SECRET" = "fallback-dev-secret" ]; then
    INSECURE="${INSECURE}  - JWT_SECRET is missing or insecure\n"
  fi
  if [ -z "$CRON_SECRET" ] || [ "$CRON_SECRET" = "change-this-to-a-secure-random-string-in-production" ] || [ "$CRON_SECRET" = "please-change-this-cron-secret" ]; then
    INSECURE="${INSECURE}  - CRON_SECRET is missing or insecure\n"
  fi
  if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" = "admin123" ] || [ "$ADMIN_PASSWORD" = "change-this-admin-password-in-production" ]; then
    INSECURE="${INSECURE}  - ADMIN_PASSWORD is missing or insecure\n"
  fi
  if [ -n "$INSECURE" ]; then
    echo ""
    echo "=========================================="
    echo " WARNING: INSECURE CONFIGURATION DETECTED"
    echo "=========================================="
    printf "%b" "$INSECURE"
    echo "Please update your .env file with secure random values before deploying to production."
    if [ "$STRICT_ENV_VALIDATION" = "true" ]; then
      echo "STRICT_ENV_VALIDATION=true -> startup aborted."
      exit 1
    fi
    echo "=========================================="
    echo ""
  fi
fi

# ── Switch Prisma provider based on DB_TYPE ──
DB_TYPE="${DB_TYPE:-sqlite}"
case "$DB_TYPE" in
  postgresql) PRISMA_PROVIDER="postgresql" ;;
  mariadb|mysql) PRISMA_PROVIDER="mysql" ;;
  mssql|sqlserver) PRISMA_PROVIDER="sqlserver" ;;
  *) PRISMA_PROVIDER="sqlite" ;;
esac

if [ "$PRISMA_PROVIDER" != "sqlite" ]; then
  echo "[0/3] Switching Prisma provider to $PRISMA_PROVIDER..."
  sed -i "s/provider = \"sqlite\"/provider = \"$PRISMA_PROVIDER\"/" /app/prisma/schema.prisma
  sed -i "s/provider = \"mysql\"/provider = \"$PRISMA_PROVIDER\"/" /app/prisma/schema.prisma
  sed -i "s/provider = \"postgresql\"/provider = \"$PRISMA_PROVIDER\"/" /app/prisma/schema.prisma
  sed -i "s/provider = \"sqlserver\"/provider = \"$PRISMA_PROVIDER\"/" /app/prisma/schema.prisma
  # Ensure Text columns for long values on non-SQLite DBs
  sed -i 's/value     String   @default("")$/value     String   @default("") @db.Text/' /app/prisma/schema.prisma
  sed -i 's/details     String?$/details     String?  @db.Text/' /app/prisma/schema.prisma
  sed -i '/releaseNotes/s/String?   @map/String?  @db.Text @map/' /app/prisma/schema.prisma
  sed -i '/rawMetadata/s/String?   @map/String?  @db.Text @map/' /app/prisma/schema.prisma
  sed -i '/  description.*@map("description")/s/String?   @map/String?  @db.Text @map/' /app/prisma/schema.prisma
  sed -i '/  cves.*@map("cves")/s/String?   @map/String?  @db.Text @map/' /app/prisma/schema.prisma
  sed -i '/aiSummary/s/String?   @map/String?  @db.Text @map/' /app/prisma/schema.prisma
  npx prisma generate 2>&1 | tail -1
fi

# Auto-remap SQLite path to Docker volume if needed
if echo "$DATABASE_URL" | grep -q "^file:" && ! echo "$DATABASE_URL" | grep -q "/app/data"; then
  export DATABASE_URL="file:/app/data/production.db"
  echo "      SQLite path remapped to: $DATABASE_URL"
fi

# Wait for external database to be ready (PostgreSQL, MySQL, MariaDB, MSSQL)
if [ "$PRISMA_PROVIDER" != "sqlite" ]; then
  echo "[1/3] Waiting for database to be ready..."
  RETRIES=0
  MAX_RETRIES=30
  until npx prisma db push --accept-data-loss > /dev/null 2>&1 || [ "$RETRIES" -ge "$MAX_RETRIES" ]; do
    RETRIES=$((RETRIES + 1))
    echo "      Database not ready yet... retry $RETRIES/$MAX_RETRIES"
    sleep 2
  done

  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Database not reachable after $MAX_RETRIES retries. Aborting."
    exit 1
  fi

  echo "      Database schema synced."
else
  echo "[1/3] Running database migrations..."
  npx prisma migrate deploy
  echo "      Migrations complete."
fi

echo "[2/3] Running database seed (sources, admin, settings)..."
tsx prisma/seed.ts
echo "      Seed complete."

echo "[3/3] Starting application server..."
exec node server.js
