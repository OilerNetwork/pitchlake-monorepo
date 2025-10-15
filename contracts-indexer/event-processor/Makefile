.PHONY: help migrate-up migrate-down migrate-status check-db build run clean reset-driver-events

# Default target
help:
	@echo "Available commands:"
	@echo "  migrate-up         - Run all database migrations"
	@echo "  migrate-down       - Roll back all database migrations"
	@echo "  migrate-status     - Check migration status"
	@echo "  check-db           - Check if database is accessible"
	@echo "  reset-driver-events - Mark all driver events as unprocessed"
	@echo "  build              - Build the application"
	@echo "  run                - Run the application"
	@echo "  clean              - Clean build artifacts"

# Check if database is running and accessible
check-db:
	@echo "Checking database connection..."
	@if ! docker ps --format "table {{.Names}}" | grep -q "pitchlake-db"; then \
		echo "Error: pitchlake-db is not running. Please start the database first."; \
		exit 1; \
	fi; \
	echo "✓ pitchlake-db is running"

# Migration commands using Go migration tool
migrate-up:
	@echo "Running database migrations..."
	@cd migrate && go run main.go up

migrate-down:
	@echo "Rolling back database migrations..."
	@cd migrate && go run main.go down

migrate-status:
	@echo "Checking migration status..."
	@cd migrate && go run main.go status

migrate-force-drop:
	@echo "⚠️  WARNING: This will drop the migration table and reset all migration state!"
	@echo "This should only be used to fix dirty migration states."
	@read -p "Are you sure you want to continue? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Dropping migration table..."
	@cd migrate && go run main.go force-drop

# Mark all driver events as unprocessed
reset-driver-events: check-db
	@echo "⚠️  WARNING: This will mark ALL driver events as unprocessed!"
	@echo "This means the event processor will reprocess all events from the beginning."
	@read -p "Are you sure you want to continue? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Resetting driver events..."
	@if docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "UPDATE driver_events SET is_processed = false;" 2>/dev/null; then \
		echo "✅ Successfully marked all driver events as unprocessed"; \
		echo "📊 The event processor will now reprocess all events"; \
	else \
		echo "❌ Failed to reset driver events"; \
		echo "Make sure the driver_events table exists and is accessible"; \
		exit 1; \
	fi


docker-build:
	@echo "Building event-processor..."
	@docker compose build
	@echo "✓ Build completed!"

docker-run:
	@echo "Running event-processor..."
	@docker compose up -d
	@echo "✓ Run completed!"

dev:
	@echo "🔍Checking database status..."
	@make check-db
	@echo "🔍Migrating database..."
	@make migrate-up PITCHLAKE_DB_URL=postgres://pitchlake_user:pitchlake_password@localhost:5437/pitchlake?sslmode=disable
	@echo "🔧 Building Docker image..."
	@make docker-build
	@echo ""
	@echo "🚀 Development environment ready!"
	@echo "📊 Database: pitchlake-db (connected via pitchlake-network)"
	@echo "🐳 Docker image: Built successfully"
	@echo "Start the event processor with: make docker-run"
	@make docker-run