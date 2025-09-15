.PHONY: help start-dbs stop-dbs migrate-pitchlake migrate-fossil migrate-all clean-dbs check-dbs check-migrations

# Default target
help:
	@echo "Available commands:"
	@echo "  start-dbs        - Start both fossil and pitchlake databases"
	@echo "  stop-dbs         - Stop both databases"
	@echo "  migrate-pitchlake - Run pitchlake database migrations"
	@echo "  migrate-fossil   - Run fossil database migrations"
	@echo "  migrate-all      - Run all migrations"
	@echo "  clean-dbs        - Stop and remove databases (data will be lost)"
	@echo "  dev              - Start databases and run all migrations"
	@echo "  check-migrations - Check migration status for all databases"
	@echo "  create-network   - Create pitchlake-network"
	@echo "  docker-up        - Create network and start all services"
	@echo "  clean-project    - Clean only this project's resources (safer)"
	@echo "  clean-network    - Remove pitchlake-network"

# Check if databases are running
check-dbs:
	@if docker ps --format "table {{.Names}}" | grep -q "fossil-db\|pitchlake-db"; then \
		echo "Databases are already running"; \
	else \
		echo "Starting databases..."; \
		docker compose up -d fossil-db pitchlake-db; \
		echo "Waiting for databases to be ready..."; \
		sleep 5; \
	fi

# Check migration status for all databases
check-migrations: check-dbs
	@echo "Checking migration status..."
	@echo "Pitchlake database:"; \
	if docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "\dt" 2>/dev/null | grep -q "twap_state"; then \
		echo "  ✓ twap_state table exists"; \
	else \
		echo "  ✗ twap_state table missing - migrations needed"; \
	fi; \
	echo "Fossil database:"; \
	if docker exec fossil-db psql -U fossil_user -d fossil -c "\dt" 2>/dev/null | grep -q "blockheaders"; then \
		echo "  ✓ blockheaders table exists"; \
	else \
		echo "  ✗ blockheaders table missing - migrations needed"; \
	fi

# Start databases (only if not running)
start-dbs: check-dbs
	@echo "Databases are ready!"

# Stop databases
stop-dbs:
	@echo "Stopping databases..."
	docker compose stop fossil-db pitchlake-db

# Run pitchlake migrations (only if needed)
migrate-pitchlake: check-dbs
	@if docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "\dt" 2>/dev/null | grep -q "twap_state"; then \
		echo "Pitchlake migrations already applied"; \
	else \
		echo "Running pitchlake migrations..."; \
		docker exec -i pitchlake-db psql -U pitchlake_user -d pitchlake < migrations/pitchlake/001_create_twap_tables.sql; \
		docker exec -i pitchlake-db psql -U pitchlake_user -d pitchlake < migrations/pitchlake/002_add_notify_triggers.sql; \
		echo "Pitchlake migrations completed!"; \
	fi

# Run fossil migrations (only if needed)
migrate-fossil: check-dbs
	@if docker exec fossil-db psql -U fossil_user -d fossil -c "\dt" 2>/dev/null | grep -q "blockheaders"; then \
		echo "Fossil migrations already applied"; \
	else \
		echo "Running fossil migrations..."; \
		docker exec -i fossil-db psql -U fossil_user -d fossil < migrations/fossil/001_create_blockheaders_table.sql; \
		echo "Fossil migrations completed!"; \
	fi

# Run all migrations
migrate-all: migrate-pitchlake migrate-fossil
	@echo "All migrations completed!"

# Clean databases (stop and remove)
clean-dbs:
	@echo "Cleaning databases..."
	docker compose down -v
	@echo "Databases cleaned!"

# Create network
create-network:
	@echo "Creating pitchlake-network..."
	@if docker network ls | grep -q "pitchlake-network"; then \
		echo "Network already exists"; \
	else \
		docker network create pitchlake-network; \
		echo "Network created successfully!"; \
	fi

# Docker compose up with network creation
docker-up: create-network
	@echo "Starting all services..."
	docker compose up -d

# Clean network only
clean-network:
	@echo "Removing pitchlake-network..."
	@if docker network ls | grep -q "pitchlake-network"; then \
		docker network rm pitchlake-network; \
		echo "Network removed!"; \
	else \
		echo "Network does not exist"; \
	fi

# Clean only this project's resources (safer)
clean-project:
	@echo "🧹 Cleaning project resources..."
	@echo "Stopping containers..."
	docker compose down -v
	@echo "Removing pitchlake-network..."
	@if docker network ls | grep -q "pitchlake-network"; then \
		docker network rm pitchlake-network; \
	fi
	@echo "✅ Project resources cleaned!"


# Development setup: start databases and run migrations
dev: create-network start-dbs migrate-all
	@echo "Development environment ready!"
	@echo "You can now run: npm run dev" 