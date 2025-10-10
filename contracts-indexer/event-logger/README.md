# Event Logger

A high-performance StarkNet event indexing and logging system built as a Juno plugin. The Event Logger captures, processes, and stores blockchain events from StarkNet vaults in real-time.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Go 1.25.0
- Access to fossil-monorepo network

### Development Setup

1. **Start the fossil-monorepo infrastructure:**
   ```bash
   cd ../../fossil-monorepo
   make dev-up
   ```

2. **Set up the event-logger:**
   ```bash
   cd contracts-indexer/event-logger
   make dev
   ```

3. **Start the service:**
   ```bash
   make start-docker
   ```

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
PITCHLAKE_DB_URL=postgres://pitchlake_user:pitchlake_password@pitchlake-db:5432/pitchlake?sslmode=disable

# Network Configuration
RPC_URL=https://starknet-sepolia.infura.io/v3/YOUR_PROJECT_ID

# Contract Configuration
UDC_ADDRESS=0x1234567890abcdef...

# Optional Configuration
CURSOR=12345  # Starting block number
```

## 📋 Available Commands

### Development Commands
```bash
make dev                    # Set up development environment
make build                  # Build the plugin
make start-docker          # Start services
make stop-docker           # Stop services
make clean-docker          # Clean up Docker resources
make restart-docker-network # Restart services
```

### Database Commands
```bash
make migrate-up            # Run database migrations
make migrate-down          # Roll back migrations
make migrate-status        # Check migration status
make migrate-force-drop    # Drop migration table (fixes dirty states)
make check-db              # Check database connection
```

### Vault Management
```bash
make add-vault VAULT_ADDRESS=0x... DEPLOYED_BLOCK_HASH=0x... DEPLOYED_BLOCK_NUMBER=1213  # Add new vault
make list-vaults           # List all registered vaults
make list-events           # List all events
make list-blocks           # List all blocks
make list-driver-events    # List all driver events
```

### Infrastructure Commands
```bash
make check-fossil-network  # Check fossil-monorepo network
make network-status        # Check network status
make help-infra            # Show infrastructure help
```

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure fossil-monorepo is running: `cd ../../fossil-monorepo && make dev-up`
   - Check network connectivity: `make check-fossil-network`

2. **Plugin Build Failed**
   - Ensure Go 1.25.0 is installed
   - Run `go mod tidy` to resolve dependencies

3. **Migration Errors**
   - Check database permissions
   - Verify database is accessible: `make check-db`

### Logs and Debugging

```bash
# View real-time logs
docker compose logs juno_plugin

# Check specific service logs
docker compose logs juno_plugin

# Debug mode (if needed)
VM_DEBUG=true make build
```

## 📚 Documentation

For detailed technical documentation, see:

- **[documentation.md](./documentation.md)** - Comprehensive technical documentation
- **[Architecture](./documentation.md#system-architecture)** - System architecture and components
- **[Database Schema](./documentation.md#database-schema)** - Complete database structure
- **[Plugin Implementation](./documentation.md#plugin-implementation)** - Juno plugin details
- **[Event Processing](./documentation.md#event-processing-flow)** - Event processing flow
