#!/bin/bash
# migrate-up.sh - Run all database migrations in order

set -e

MIGRATIONS_DIR="db/migrations"
DB_CONTAINER="pitchlake-db"
DB_USER="pitchlake_user"
DB_NAME="pitchlake"

echo "🚀 Starting database migrations..."

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Error: Migrations directory '$MIGRATIONS_DIR' not found"
    exit 1
fi

# Get all .up.sql files and sort them by filename
MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -name "*.up.sql" | sort)

if [ -z "$MIGRATION_FILES" ]; then
    echo "❌ Error: No migration files found in '$MIGRATIONS_DIR'"
    exit 1
fi

echo "📋 Found migration files:"
echo "$MIGRATION_FILES" | sed 's/^/  /'

echo ""
echo "🔄 Running migrations..."

# Run each migration file
for migration_file in $MIGRATION_FILES; do
    migration_name=$(basename "$migration_file" .up.sql)
    echo "  📄 Applying: $migration_name"
    
    if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$migration_file"; then
        echo "    ✅ Success: $migration_name"
    else
        echo "    ❌ Failed: $migration_name"
        echo "🛑 Migration failed. Stopping."
        exit 1
    fi
done

echo ""
echo "✅ All migrations completed successfully!"
echo "📊 Database is now up to date."