.DEFAULT_GOAL := help

##@ Infrastructure Setup

.PHONY: setup-infra
setup-infra: ## Set up the complete infrastructure stack for Pitchlake
	@echo "🚀 Setting up Pitchlake Infrastructure Stack..."
	@echo ""
	@echo "📋 Step 1: Checking prerequisites..."
	@$(MAKE) check-prerequisites
	@echo ""
	@echo "📋 Step 2: Setting up Fossil Monorepo..."
	@cd fossil-monorepo && $(MAKE) setup
	@echo ""
	@echo "📋 Step 3: Creating shared network..."
	@$(MAKE) create-network
	@echo ""
	@echo "📋 Step 4: Building Docker images..."
	@$(MAKE) build-all
	@echo ""
	@echo "✅ Infrastructure setup complete!"
	@echo ""
	@echo "🌐 Available services (when started):"
	@echo "  📡 Katana (StarkNet): http://localhost:5050"
	@echo "  📊 Fossil Offchain Processor: http://localhost:3000"
	@echo "  🔧 Fossil Proving Service API: http://localhost:3001"
	@echo "  🗄️  Fossil DB: localhost:5435"
	@echo "  🗄️  Offchain Processor DB: localhost:5434"
	@echo "  🗄️  Support Server Fossil DB: localhost:5436"
	@echo "  🗄️  Support Server Pitchlake DB: localhost:5437"
	@echo "  🛠️  Support Server: http://localhost:3002"
	@echo "  🌐 Backend API: http://localhost:8080"
	@echo "  🎨 Frontend: http://localhost:3003"
	@echo ""
	@echo "💡 Next steps:"
	@echo "  make start-all     - Start all services"
	@echo "  make stop-all      - Stop all services"
	@echo "  make logs          - View logs from all services"

.PHONY: check-prerequisites
check-prerequisites: ## Check if Docker and required tools are installed
	@echo "🔍 Checking prerequisites..."
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "   ❌ Docker is not installed!"; \
		echo "   Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"; \
		exit 1; \
	else \
		echo "   ✅ Docker is installed"; \
	fi
	@if ! docker info >/dev/null 2>&1; then \
		echo "   ❌ Docker daemon is not running!"; \
		echo "   Please start Docker Desktop and try again."; \
		exit 1; \
	else \
		echo "   ✅ Docker daemon is running"; \
	fi
	@if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then \
		echo "   ❌ Docker Compose is not available!"; \
		echo "   Please install Docker Compose or use Docker Desktop with built-in compose."; \
		exit 1; \
	else \
		echo "   ✅ Docker Compose is available"; \
	fi

.PHONY: create-network
create-network: ## Create the local-network for Fossil services
	@echo "🌐 Creating local-network..."
	@if docker network ls | grep -q "local-network"; then \
		echo "   ✅ local-network already exists"; \
	else \
		docker network create local-network; \
		echo "   ✅ Created local-network"; \
	fi

.PHONY: build-all
build-all: ## Build all Docker images
	@echo "🔨 Building all Docker images..."
	@echo "   📋 Building Support Server..."
	@cd support-server && docker build -t pitchlake-support-server .
	@echo "   📋 Building Backend..."
	@cd backend && docker build -t pitchlake-backend .
	@echo "   📋 Building Frontend..."
	@cd frontend && docker build -t pitchlake-frontend .
	@echo "   ✅ All images built successfully!"

##@ Service Management

.PHONY: start-all
start-all: ## Start all services (Fossil first, then Pitchlake services)
	@echo "🚀 Starting all services..."
	@echo "📋 Step 1: Starting Fossil services (primary chain)..."
	@cd fossil-monorepo && $(MAKE) dev-up
	@echo "📋 Step 2: Starting Pitchlake services..."
	@docker-compose up -d
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 10
	@echo "✅ All services started!"
	@echo ""
	@echo "🌐 Service URLs:"
	@echo "  📡 Katana (StarkNet): http://localhost:5050"
	@echo "  📊 Fossil Offchain Processor: http://localhost:3000"
	@echo "  🔧 Fossil Proving Service API: http://localhost:3001"
	@echo "  🛠️  Support Server: http://localhost:3002"
	@echo "  🌐 Backend API: http://localhost:8080"
	@echo "  🎨 Frontend: http://localhost:3003"

.PHONY: stop-all
stop-all: ## Stop all services
	@echo "🛑 Stopping all services..."
	@echo "📋 Step 1: Stopping Pitchlake services..."
	@docker-compose down
	@echo "📋 Step 2: Stopping Fossil services..."
	@cd fossil-monorepo && $(MAKE) dev-down
	@echo "✅ All services stopped!"


##@ Development

.PHONY: dev
dev: setup-infra start-all ## Complete development setup (setup + start all services)
	@echo "🎉 Development environment ready!"
	@echo "All services are running and ready for development."

.PHONY: restart
restart: stop-all start-all ## Restart all services

.PHONY: restart-pitchlake
restart-pitchlake: ## Restart only Pitchlake services (keeps Fossil running)
	@echo "🔄 Restarting Pitchlake services..."
	@docker-compose down
	@docker-compose up -d
	@echo "✅ Pitchlake services restarted!"

##@ Monitoring & Debugging

.PHONY: logs
logs: ## View logs from all services
	@echo "📋 Viewing logs from all services..."
	@echo "Press Ctrl+C to exit"
	@docker-compose logs -f


.PHONY: status
status: ## Show status of all services
	@echo "📊 Service Status:"
	@echo ""
	@echo "🐳 Docker Containers:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(katana|fossil|pitchlake|support|backend|frontend)" || echo "No services running"
	@echo ""
	@echo "🌐 Networks:"
	@docker network ls | grep -E "(local|fossil)" || echo "No custom networks found"
	@echo ""
	@echo "🔗 Service Health:"
	@if docker ps | grep -q "katana"; then \
		echo "   ✅ Katana (StarkNet): http://localhost:5050"; \
	else \
		echo "   ❌ Katana not running"; \
	fi
	@if docker ps | grep -q "offchain-processor"; then \
		echo "   ✅ Fossil Offchain Processor: http://localhost:3000"; \
	else \
		echo "   ❌ Fossil Offchain Processor not running"; \
	fi
	@if docker ps | grep -q "proving-service-api"; then \
		echo "   ✅ Fossil Proving API: http://localhost:3001"; \
	else \
		echo "   ❌ Fossil Proving API not running"; \
	fi
	@if docker ps | grep -q "support-server"; then \
		echo "   ✅ Support Server: http://localhost:3002"; \
	else \
		echo "   ❌ Support Server not running"; \
	fi
	@if docker ps | grep -q "backend"; then \
		echo "   ✅ Backend API: http://localhost:8080"; \
	else \
		echo "   ❌ Backend not running"; \
	fi
	@if docker ps | grep -q "frontend"; then \
		echo "   ✅ Frontend: http://localhost:3003"; \
	else \
		echo "   ❌ Frontend not running"; \
	fi

##@ Database Management

.PHONY: migrate
migrate: ## Run database migrations
	@echo "🗄️  Running database migrations..."
	@cd support-server && $(MAKE) migrate-all
	@echo "✅ Migrations completed!"

.PHONY: reset-dbs
reset-dbs: ## Reset all databases (WARNING: This will delete all data!)
	@echo "⚠️  WARNING: This will delete all database data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🗄️  Resetting databases..."
	@docker-compose down -v
	@cd fossil-monorepo && $(MAKE) dev-down
	@echo "✅ Databases reset!"

##@ Testing

.PHONY: test
test: ## Run tests across all components
	@echo "🧪 Running tests across all components..."
	@cd fossil-monorepo && $(MAKE) test
	@cd backend && $(MAKE) test
	@cd support-server && npm test
	@cd frontend && npm test
	@echo "✅ All tests completed!"


##@ Cleanup

.PHONY: clean
clean: ## Clean up all infrastructure (removes volumes and networks)
	@echo "🧹 Cleaning up all infrastructure..."
	@echo "⚠️  This will remove all data and volumes!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@$(MAKE) stop-all
	@docker system prune -f
	@docker volume prune -f
	@docker network prune -f
	@echo "✅ Infrastructure cleaned!"


##@ Help

.PHONY: help
help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)