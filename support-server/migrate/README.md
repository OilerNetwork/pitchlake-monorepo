# Support Server Migration System

This is a standalone TypeScript migration system for the support-server that manages database schema changes using a `support_migrations` table.

## Structure

- `migrate.ts` - The TypeScript migration tool that handles up/down/status operations
- `../migrations/pitchlake/` - Directory containing SQL migration files
- `../Makefile` - Make commands for easy migration execution

## Migration Files

Migration files follow the naming convention:
- `001_create_twap_tables.sql` - Forward migration
- `001_create_twap_tables_rollback.sql` - Rollback migration (alternative: `001_create_twap_tables_down.sql`)

The version number (001) determines the order of execution.

## Usage

### Using Make commands (recommended):

```bash
# From the support-server root directory
make migrate-pitchlake
make migrate-pitchlake-down
make migrate-pitchlake-status
```

### Using the TypeScript tool directly:

```bash
# From the migrate directory
cd migrate
npx ts-node migrate.ts up
npx ts-node migrate.ts down
npx ts-node migrate.ts status
```

**Note:** The `PITCHLAKE_DB_URL` environment variable should be set in your `.env` file.

## Migration Table

The system creates and uses a `support_migrations` table to track applied migrations:

```sql
CREATE TABLE support_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Features

- **Transactional**: Each migration runs in a transaction
- **Idempotent**: Can be run multiple times safely
- **Rollback Support**: Supports down migrations for rollbacks
- **Status Tracking**: Shows which migrations are applied
- **Standalone**: Runs independently from the main application
- **TypeScript**: Built with TypeScript for type safety
