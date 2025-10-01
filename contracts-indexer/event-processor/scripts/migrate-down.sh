#!/bin/bash
# migrate-down.sh - Roll back all database migrations in reverse order

set -e

MIGRATIONS_DIR="db/migrations"
DB_CONTAINER="pitchlake-db"
DB_USER="pitchlake_user"
DB_NAME="pitchlake"

echo "🔄 Starting database migration rollback..."

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Error: Migrations directory '$MIGRATIONS_DIR' not found"
    exit 1
fi

# Get all .down.sql files and sort them in reverse order
MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -name "*.down.sql" | sort -r)

if [ -z "$MIGRATION_FILES" ]; then
    echo "❌ Error: No rollback files found in '$MIGRATIONS_DIR'"
    exit 1
fi

echo "📋 Found rollback files (in reverse order):"
echo "$MIGRATION_FILES" | sed 's/^/  /'

echo ""
echo "🔄 Rolling back migrations..."

# Run each rollback file
for migration_file in $MIGRATION_FILES; do
    migration_name=$(basename "$migration_file" .down.sql)
    echo "  📄 Rolling back: $migration_name"
    
    if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$migration_file"; then
        echo "    ✅ Success: $migration_name"
    else
        echo "    ❌ Failed: $migration_name"
        echo "🛑 Rollback failed. Stopping."
        exit 1
    fi
done

echo ""
echo "✅ All migrations rolled back successfully!"
echo "📊 Database has been reset."
