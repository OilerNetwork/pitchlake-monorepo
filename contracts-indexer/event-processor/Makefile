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
		echo "Run: cd ../../fossil-monorepo && make dev-up"; \
		exit 1; \
	fi; \
	echo "✓ pitchlake-db is running"

# Run all database migrations using the migration script
migrate-up: check-db
	@echo "Running all database migrations..."
	@chmod +x scripts/migrate-up.sh
	@./scripts/migrate-up.sh

# Roll back all database migrations using the migration script
migrate-down: check-db
	@echo "⚠️  WARNING: This will roll back all migrations and drop tables!"
	@read -p "Are you sure you want to continue? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Rolling back all migrations..."
	@chmod +x scripts/migrate-down.sh
	@./scripts/migrate-down.sh

# Check migration status
migrate-status: check-db
	@echo "Checking migration status..."
	@echo "Tables in pitchlake database:"
	@docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "\dt" 2>/dev/null || echo "Could not connect to database"
	@echo ""
	@echo "Checking for specific tables:"
	@if docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "\dt" 2>/dev/null | grep -q "VaultStates"; then \
		echo "  ✓ VaultStates table exists"; \
	else \
		echo "  ✗ VaultStates table missing"; \
	fi; \
	if docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "\dt" 2>/dev/null | grep -q "Option_Rounds"; then \
		echo "  ✓ Option_Rounds table exists"; \
	else \
		echo "  ✗ Option_Rounds table missing"; \
	fi; \
	if docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "\dt" 2>/dev/null | grep -q "Liquidity_Providers"; then \
		echo "  ✓ Liquidity_Providers table exists"; \
	else \
		echo "  ✗ Liquidity_Providers table missing"; \
	fi

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

# Build the application
build:
	@echo "Building event-processor..."
	@go build -o event-processor main.go
	@echo "✓ Build completed!"

# Run the application
run: check-db
	@echo "Starting event-processor..."
	@go run main.go

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -f event-processor
	@echo "✓ Clean completed!"

# Development setup
dev: migrate-up build
	@echo "🔧 Development environment ready!"
	@echo "📊 Database: Migrations applied"
	@echo "🏗️  Application: Built successfully"
	@echo "📋 Next steps:"
	@echo "   • Run 'make run' to start the application"
	@echo "   • Use 'make migrate-status' to check database status"
