# Event Logger Migration System

This is a standalone migration system for the event-logger that uses `golang-migrate` to manage database schema changes with a custom `logger_migrations` table.

## Structure

- `main.go` - The migration tool that handles up/down/status operations
- `../db/migrations/` - Directory containing SQL migration files
- `../Makefile` - Make commands for easy migration execution

## Migration Files

Migration files follow the golang-migrate naming convention:
- `000001_create_events_table.up.sql` - Forward migration
- `000001_create_events_table.down.sql` - Rollback migration

The version number (000001) determines the order of execution.

## Usage

### Using Make commands (recommended):

```bash
# From the event-logger root directory
make migrate-up
make migrate-down
make migrate-status
```

### Using the Go tool directly:

```bash
# From the migrate directory
cd migrate
go run main.go up
go run main.go down
go run main.go status
```

**Note:** The `PITCHLAKE_DB_URL` environment variable should be set in your `.env` file.

## Migration Table

The system uses golang-migrate with a custom `logger_migrations` table to track applied migrations, separate from other modules' migration tables.

## Features

- **golang-migrate**: Uses the industry-standard golang-migrate library
- **Custom Migration Table**: Uses `logger_migrations` table (separate from other modules)
- **Transactional**: Each migration runs in a transaction
- **Idempotent**: Can be run multiple times safely
- **Rollback Support**: Supports down migrations for rollbacks
- **Status Tracking**: Shows which migrations are applied
- **Standalone**: Runs independently from the main plugin
