# PitchLake Contracts Makefile

.PHONY: help build deploy-local deploy-local-no-build clean

# Default target
help:
	@echo "Available targets:"
	@echo "  build            - Build the contracts using Scarb"
	@echo "  test-all         - Run all tests"
	@echo "  test             - Run not ignored tests"
	@echo "  test-ignored     - Run ignored tests"
	@echo "  deploy-local     - Build contracts and deploy vault to local network"
	@echo "  deploy-local-no-build - Deploy vault to local network (assumes contracts are built)"
	@echo "  clean            - Clean build artifacts"
	@echo "  help             - Show this help message"

# Build contracts
build:
	@echo "🔨 Building contracts..."
	scarb build
	@echo "✅ Build completed!"

# Run all tests
test-all: build
	@echo "🧪 Running all tests..."
	scarb test --include-ignored
	@echo "✅ All tests completed!"

# Run not ignored tests
test: build
	@echo "🧪 Running tests..."
	scarb test
	@echo "✅ Tests completed!"

# Run ignored tests
test-ignored: build
	@echo "🧪 Running ignored tests..."
	scarb test --ignored
	@echo "✅ Ignored tests completed!"

# Deploy vault contract locally
deploy-local: build
	@echo "🚀 Deploying vault contract locally..."
	@if [ ! -f ".env" ]; then \
		echo "❌ .env file not found. Please create one with required environment variables."; \
		echo "You can copy the example file: cp env.example .env"; \
		echo ""; \
		echo "Required variables:"; \
		echo "  STARKNET_DEPLOYER_ADDRESS"; \
		echo "  STARKNET_DEPLOYER_PRIVATE_KEY"; \
		echo "  STARKNET_DEPLOYER_PUBLIC_KEY"; \
		echo "  VERIFIER_ADDRESS"; \
		echo ""; \
		echo "Optional variables (with defaults):"; \
		echo "  RPC_URL (default: https://starknet-sepolia.public.blastapi.io/rpc/v0_7)"; \
		echo "  ETH_ADDRESS (default: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7)"; \
		echo "  STRIKE_LEVEL (default: 0)"; \
		echo "  ALPHA (default: 5000)"; \
		echo "  ROUND_TRANSITION_DURATION (default: 180)"; \
		echo "  AUCTION_DURATION (default: 180)"; \
		echo "  ROUND_DURATION (default: 720)"; \
		echo "  PROGRAM_ID (default: 0x50495443485f4c414b455f5631)"; \
		echo "  PROVING_DELAY (default: 0)"; \
		exit 1; \
	fi
	@echo "📦 Installing Go dependencies..."
	cd deployment && go mod tidy
	@echo "🚀 Running deployment..."
	cd deployment && go run cmd/deploy/main.go
	@echo "✅ Deployment completed!"

# Deploy vault contract locally (skipping build)
deploy-local-no-build:
	@echo "🚀 Deploying vault contract locally (no-build)..."
	@if [ ! -f ".env" ]; then \
		echo "❌ .env file not found. Please create one with required environment variables."; \
		echo "You can copy the example file: cp env.example .env"; \
		echo ""; \
		echo "Required variables:"; \
		echo "  STARKNET_DEPLOYER_ADDRESS"; \
		echo "  STARKNET_DEPLOYER_PRIVATE_KEY"; \
		echo "  STARKNET_DEPLOYER_PUBLIC_KEY"; \
		echo "  VERIFIER_ADDRESS"; \
		echo ""; \
		echo "Optional variables (with defaults):"; \
		echo "  RPC_URL (default: https://starknet-sepolia.public.blastapi.io/rpc/v0_7)"; \
		echo "  ETH_ADDRESS (default: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7)"; \
		echo "  STRIKE_LEVEL (default: 0)"; \
		echo "  ALPHA (default: 5000)"; \
		echo "  ROUND_TRANSITION_DURATION (default: 180)"; \
		echo "  AUCTION_DURATION (default: 180)"; \
		echo "  ROUND_DURATION (default: 720)"; \
		echo "  PROGRAM_ID (default: 0x50495443485f4c414b455f5631)"; \
		echo "  PROVING_DELAY (default: 0)"; \
		exit 1; \
	fi
	@echo "📦 Installing Go dependencies..."
	cd deployment && go mod tidy
	@echo "🚀 Running deployment..."
	cd deployment && go run cmd/deploy/main.go
	@echo "✅ Deployment completed!"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	scarb clean
	@echo "✅ Clean completed!"
