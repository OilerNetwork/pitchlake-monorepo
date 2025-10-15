
# Build commands
build:
	go build -tags 'no_coverage' -buildmode=plugin -o myplugin.so plugin/myplugin.go

# Docker commands

build-docker:
	@echo "Building event logger..."
	docker-compose build

start-docker:
	@echo "Starting event logger..."
	docker compose up -d

stop-docker:
	@echo "Stopping event logger..."
	docker compose down

clean-docker:
	docker compose down -v --remove-orphans
	docker system prune -f

reset-docker-network:
	@echo "Resetting docker network..."
	docker network rm pitchlake-network
	docker-compose down -v --remove-orphans

# Development setup
dev:
	@echo "🔍Checking database status..."
	@make check-db
	@echo "🔍Migrating database..."
	@make migrate-up PITCHLAKE_DB_URL=postgres://pitchlake_user:pitchlake_password@localhost:5437/pitchlake?sslmode=disable
	@echo "🔧 Building Docker image..."
	@make build-docker
	@echo ""
	@echo "🚀 Development environment ready!"
	@echo "📊 Database: pitchlake-db (connected via pitchlake-network)"
	@echo "🐳 Docker image: Built successfully"
	@echo "Start the event logger with: make start-docker"
	@make start-docker

# Network commands - using fossil-monorepo network
check-fossil-network:
	@echo "Checking fossil-monorepo_local-network..."
	@if docker network ls | grep -q "fossil-monorepo_local-network"; then \
		echo "✓ fossil-monorepo_local-network exists"; \
	else \
		echo "✗ fossil-monorepo_local-network does not exist"; \
		echo "Please start the fossil-monorepo first with: cd ../../fossil-monorepo && make dev-up"; \
		exit 1; \
	fi

network-status:
	@echo "Checking fossil-monorepo_local-network status..."
	@if docker network ls | grep -q "pitchlake-network"; then \
		echo "✓ pitchlake-network exists"; \
		docker network inspect pitchlake-network --format "{{.IPAM.Config}}" 2>/dev/null || echo "Could not inspect network"; \
	else \
		echo "✗ pitchlake-network does not exist"; \
	fi

# Database commands - using fossil-monorepo pitchlake-db
check-db:
	@if docker ps --format "table {{.Names}}" | grep -q "pitchlake-db"; then \
		echo "✓ pitchlake-db is running and accessible via pitchlake-network"; \
	else \
		echo "✗ pitchlake-db is not running. Please start the pitchlake-network first."; \
	fi

# Migration commands using golang-migrate
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

# Vault management commands
add-vault:
	@echo "Adding vault to registry..."
	@if [ -z "$(VAULT_ADDRESS)" ] || [ -z "$(DEPLOYED_BLOCK_HASH)" ] || [ -z "$(DEPLOYED_BLOCK_NUMBER)" ]; then \
		echo "Usage: make add-vault VAULT_ADDRESS=0x... DEPLOYED_BLOCK_HASH=0x... DEPLOYED_BLOCK_NUMBER=1..."; \
		echo "Example: make add-vault VAULT_ADDRESS=0x123... DEPLOYED_BLOCK_HASH=0x456... DEPLOYED_BLOCK_NUMBER=1..."; \
		exit 1; \
	fi
	@echo "Vault Address: $(VAULT_ADDRESS)"
	@echo "Deployed Block Hash: $(DEPLOYED_BLOCK_HASH)"
	@echo "Deployed Block Number: $(DEPLOYED_BLOCK_NUMBER)"
	@echo "⚠️  This will add the vault to the registry and start indexing from deployment block"
	@read -p "Are you sure you want to continue? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "INSERT INTO vault_registry (vault_address, deployed_block_hash, deployed_block_number, last_block_indexed, last_block_processed) VALUES ('$(VAULT_ADDRESS)', '$(DEPLOYED_BLOCK_HASH)', '$(DEPLOYED_BLOCK_NUMBER)', NULL, NULL);" || echo "Failed to add vault. Make sure the container is running."

list-vaults:
	@echo "Listing all vaults in registry..."
	@docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "SELECT vault_address, deployed_block_hash, deployed_block_number, last_block_indexed, last_block_processed FROM vault_registry ORDER BY id;" || echo "Failed to list vaults. Make sure the container is running."

list-events:
	@docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "SELECT event_name, event_nonce, block_number, block_hash from events"

list-driver-events:
	@docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "SELECT * from driver_events"

list-blocks:
	@docker exec pitchlake-db psql -U pitchlake_user -d pitchlake -c "SELECT * from starknet_blocks"

# Help
help-infra:
	@echo "Infrastructure Commands:"
	@echo ""
	@echo "Network Commands:"
	@echo "  check-fossil-network - Check if fossil-monorepo_local-network exists"
	@echo "  network-status       - Check fossil-monorepo_local-network status"
	@echo ""
	@echo "Database Commands:"
	@echo "  check-db            - Check if pitchlake-db is running"
	@echo ""
	@echo "Migration Commands:"
	@echo "  migrate-up          - Run database migrations"
	@echo "  migrate-down        - Roll back database migrations"
	@echo "  migrate-status      - Check migration status"
	@echo "  migrate-force-drop  - Drop migration table (fixes dirty states)"
	@echo ""
	@echo "Vault Management Commands:"
	@echo "  add-vault           - Add a new vault to the registry"
	@echo "  list-vaults         - List all vaults in the registry"
	@echo "  list-events         - List all events in the database"
	@echo "  list-blocks         - List all blocks in the database"
	@echo "  list-driver-events  - List all driver events in the database"
	@echo ""
	@echo "Help:"
	@echo "  help-infra          - Show this help message"
	@echo ""
	@echo "Prerequisites:"
	@echo "  Make sure the fossil-monorepo is running:"
	@echo "    cd ../../fossil-monorepo && make dev-up"