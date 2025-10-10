# Support Server

A consolidated Node.js server that provides essential background services for the Pitchlake ecosystem, including TWAP calculations, state transition automation, and blockchain data processing.

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL databases (Fossil and PitchLake)
- StarkNet RPC access
- Ethereum mainnet RPC access

### Environment Setup
1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Copy example environment file
   cp env.example .env
   
   # Edit .env with your configuration
   # Required: Database URLs, RPC endpoints, StarkNet credentials
   ```

3. **Set up databases**
   ```bash
   # Start databases and run migrations
   make dev
   ```

### Running the Service

#### Option 1: Development Mode
```bash
# Run in development mode
npm run dev

# Run with watch mode
npm run dev:watch
```

#### Option 2: Production Mode
```bash
# Build the application
npm run build

# Run the built application
npm start
```

#### Option 3: Docker
```bash
# Start all services with Docker
make docker-up
```

### Verify Installation
```bash
# Check if services are running
make check-dbs

# Check migration status
make check-migrations

# View logs
docker compose logs -f
```

## 📋 Available Commands

### Development Commands
```bash
npm run dev              # Run in development mode
npm run dev:watch        # Run with watch mode
npm run build            # Build the application
npm start                # Run built application
npm test                 # Run tests
```

### Database Commands
```bash
make start-dbs           # Start databases
make stop-dbs            # Stop databases
make migrate-all         # Run all migrations
make migrate-pitchlake   # Run pitchlake database migrations
make migrate-pitchlake-down # Roll back pitchlake database migrations
make migrate-pitchlake-status # Check pitchlake migration status
make migrate-pitchlake-force-drop # Drop migration table (fixes dirty states)
make migrate-fossil      # Run fossil database migrations
make check-dbs           # Check database status
make check-migrations    # Check migration status
make clean-dbs           # Stop and remove databases (data will be lost)
make clean-job-requests  # Clear all job requests from the database
```

### Docker Commands
```bash
make docker-up           # Start all services
make clean-project       # Clean project resources
make create-network      # Create Docker network
make clean-network       # Remove pitchlake-network
```

## 🔧 Quick Configuration

### Required Environment Variables

Copy `env.example` to `.env` and configure these essential variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `FOSSIL_DB_URL` | Fossil database connection string | Yes |
| `PITCHLAKE_DB_URL` | PitchLake database connection string | Yes |
| `L1_ALCHEMY_URL` | Ethereum RPC endpoint | Yes |
| `STARKNET_RPC` | StarkNet RPC endpoint | Yes |
| `STARKNET_PRIVATE_KEY` | StarkNet private key | Yes |
| `STARKNET_ACCOUNT_ADDRESS` | StarkNet account address | Yes |
| `VAULT_ADDRESSES` | Comma-separated vault addresses | Yes |
| `FOSSIL_API_KEY` | Fossil API key | Yes |
| `FOSSIL_API_URL` | Fossil API URL | Yes |
| `USE_MOCK_VERIFIER` | **Not implemented** - mock verifier is hardcoded to `true` | No |
| `IS_DEVNET` | Enable devnet mode (block mining) | No |
| `INITIAL_BLOCK_NUMBER` | Starting block for TWAP processing | No |
| `BLOCK_BATCH_SIZE` | Number of blocks to process in each batch | No |

> **Note**: See [documentation.md](./documentation.md#configuration) for complete configuration details and optional variables.

## 🏗️ What This Service Does

The Support Server runs three main services:

- **TWAP Service**: Calculates time-weighted average prices for gas fees
- **State Transition Service**: Automates options round state transitions on StarkNet
- **Unconfirmed TWAPs Runner**: Processes real-time blockchain data

> **Note**: For detailed service documentation, see [documentation.md](./documentation.md#services).

## 📚 Documentation

For detailed technical documentation, see:

- **[documentation.md](./documentation.md)** - Comprehensive technical documentation
- **[Services](./documentation.md#services)** - Detailed service documentation
- **[Database Schema](./documentation.md#database-schema)** - Complete database structure
- **[API Reference](./documentation.md#api-reference)** - Service API documentation 