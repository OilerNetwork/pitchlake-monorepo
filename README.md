# Pitchlake Production - Complete Development Setup

This repository contains a complete DeFi options trading platform built on StarkNet with RISC0 proof generation capabilities. The system integrates multiple components including smart contracts, backend services, frontend, and the Fossil monorepo for proof generation.

## 🏗️ System Architecture

The Pitchlake system consists of several interconnected components:

- **Fossil Monorepo**: RISC0 proof generation and StarkNet verification system
- **Smart Contracts**: Cairo contracts for options trading vaults
- **Backend API**: Go-based WebSocket server for real-time data
- **Support Server**: Node.js service for data processing and cron jobs
- **Frontend**: Next.js application for user interface
- **Databases**: PostgreSQL instances for data storage

## 🚀 Quick Start

### Prerequisites

Before starting, ensure you have the following installed:

- **Docker & Docker Compose**: Required for containerized services
- **Make**: For running build and deployment commands
- **Git**: For version control

### 1. Initial Setup

Clone the repository and navigate to the project root:

```bash
git clone <repository-url>
cd "Pitchlake Production"
```

### 2. Complete Development Environment Setup

Run the complete setup command to initialize everything:

```bash
make start-all
```

This single command will:
1. ✅ Check prerequisites (Docker, Docker Compose)
2. 🚀 Start Fossil services (primary chain with RISC0 proof generation)
3. 🔄 Sync contract addresses from Fossil to Pitchlake
4. 🔨 Build all Pitchlake Docker images
5. 🚀 Start all Pitchlake services
6. ⏳ Wait for services to be healthy

### 3. Access Your Services

Once setup is complete, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3003 | Main user interface |
| **Backend API** | http://localhost:8080 | WebSocket API server |
| **Support Server** | http://localhost:3002 | Data processing service |
| **Katana (StarkNet)** | http://localhost:5050 | StarkNet development network |
| **Fossil Offchain Processor** | http://localhost:3000 | RISC0 proof generation API |
| **Fossil Proving Service** | http://localhost:3001 | Proof verification service |

## 📋 Makefile Commands

The project uses a comprehensive Makefile system for managing the entire development workflow.

### 🎯 Main Commands

| Command | Description |
|---------|-------------|
| `make start-all` | **Complete development setup** - Sets up and starts all services |
| `make stop-all` | Stop all services gracefully |
| `make help` | Display all available commands with descriptions |

> **Note**: `make dev` is currently broken and should not be used.

### 🔧 Service Management

| Command | Description |
|---------|-------------|
| `make build-all` | Build all Docker images |
| `make restart` | Restart Pitchlake services (rebuilds containers) |
| `make restart-pitchlake` | Restart only Pitchlake services (keeps Fossil running) |
| `make force-rebuild` | Force rebuild all containers with cleanup |
| `make sync-addresses` | Sync contract addresses from Fossil to Pitchlake |

### 📊 Monitoring & Debugging

| Command | Description |
|---------|-------------|
| `make status` | Show status of all services and health checks |
| `make logs` | View logs from all services (follow mode) |
| `make check-prerequisites` | Verify Docker and required tools are installed |

### 🗄️ Database Management

| Command | Description |
|---------|-------------|
| `make migrate` | Run database migrations |
| `make reset-dbs` | Reset all databases (⚠️ **WARNING**: Deletes all data!) |

### 🧪 Testing

| Command | Description |
|---------|-------------|
| `make test` | Run tests across all components |

### 🧹 Cleanup

| Command | Description |
|---------|-------------|
| `make clean` | Clean up all infrastructure (removes volumes and networks) |

## 🔄 Development Workflow

### Typical Development Session

1. **Start Development Environment**:
   ```bash
   make start-all
   ```

2. **Make Code Changes**: Edit files in any component (frontend, backend, contracts, etc.)

3. **Restart Services** (if needed):
   ```bash
   make restart-pitchlake  # Restart only Pitchlake services
   # OR
   make restart           # Full restart with rebuild
   ```

4. **Monitor Services**:
   ```bash
   make status  # Check service health
   make logs    # View real-time logs
   ```

5. **Stop When Done**:
   ```bash
   make stop-all
   ```

### Component-Specific Development

#### Frontend Development
```bash
cd frontend
npm run dev  # Start Next.js development server
```

#### Backend Development
```bash
cd backend
make run     # Start Go server directly
```

#### Smart Contract Development
```bash
cd contracts
make build   # Build Cairo contracts
make test    # Run contract tests
```

#### Fossil Monorepo Development
```bash
cd fossil-monorepo
make dev-up  # Start Fossil services
make dev-down # Stop Fossil services
```

## 🌐 Environment Configuration

The system uses multiple environment files for different deployment scenarios:

### Root Level Environment Files

- **`.env.example`**: Template with all required environment variables
- **`.env.local`**: Local development configuration (auto-generated)
- **`.env.docker`**: Docker container configuration (auto-generated)

### Key Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VAULT_ADDRESSES` | Comma-separated vault contract addresses | `0x123...,0x456...,0x789...` |
| `STARKNET_RPC` | StarkNet RPC endpoint | `http://localhost:5050` |
| `FOSSIL_API_KEY` | API key for Fossil services | `generated_automatically` |
| `FOSSIL_API_URL` | Fossil API endpoint | `http://localhost:3000` |
| `PITCHLAKE_DB_URL` | Pitchlake database connection | `postgres://user:pass@localhost:5433/db` |
| `FOSSIL_DB_URL` | Fossil database connection | `postgres://user:pass@localhost:5432/db` |

## 🔧 Fossil Monorepo Integration

The Fossil monorepo is a critical component that provides:

- **RISC0 Proof Generation**: Zero-knowledge proofs for data integrity
- **StarkNet Verification**: On-chain proof verification
- **Contract Deployment**: Automatic deployment of vault contracts
- **API Services**: RESTful APIs for proof generation and verification

### Fossil Services

| Service | Port | Purpose |
|---------|------|---------|
| Offchain Processor | 3000 | HTTP API for job management |
| Proving Service API | 3001 | Proof verification service |
| Katana (StarkNet) | 5050 | StarkNet development network |

### Contract Addresses

The system automatically deploys and manages multiple vault contracts:

- **12-minute vault**: Short-term options
- **3-hour vault**: Medium-term options  
- **1-month vault**: Long-term options

Contract addresses are automatically synced between Fossil and Pitchlake services.

## 🐛 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
make check-prerequisites  # Verify Docker is running
make clean               # Clean up and try again
make start-all           # Full restart
```

#### Contract Address Issues
```bash
make sync-addresses      # Re-sync addresses from Fossil
make restart-pitchlake   # Restart with updated addresses
```

#### Database Connection Issues
```bash
make reset-dbs          # Reset databases (⚠️ Deletes data!)
make migrate            # Re-run migrations
```

#### Port Conflicts
Check if ports are already in use:
```bash
lsof -i :3000  # Check port 3000
lsof -i :3001  # Check port 3001
lsof -i :3002  # Check port 3002
lsof -i :3003  # Check port 3003
lsof -i :5050  # Check port 5050
lsof -i :8080  # Check port 8080
```

### Service Health Checks

```bash
make status  # Comprehensive health check
```

This will show:
- ✅ Running services with URLs
- ❌ Failed services
- 🌐 Network status
- 🔗 Service connectivity

### Logs and Debugging

```bash
make logs  # View all service logs
```

For specific service logs:
```bash
docker logs frontend -f
docker logs backend -f
docker logs support-server -f
```

## 📚 Additional Resources

### Component-Specific Documentation

- **Fossil Monorepo**: See `fossil-monorepo/README.md`
- **Smart Contracts**: See `contracts/README.md`
- **Frontend**: See `frontend/README.md`
- **Backend**: See `backend/README.md`
- **Support Server**: See `support-server/README.md`

### Development Tools

- **Contract Testing**: Use `contracts/Makefile` for Cairo contract development
- **API Testing**: Use Fossil's test script: `fossil-monorepo/test-local-request.sh`
- **Database Management**: Use `support-server/Makefile` for database operations

## 🤝 Contributing

1. Make your changes in the appropriate component
2. Test locally using `make dev`
3. Run tests with `make test`
4. Submit pull request

## 📄 License

See individual component directories for license information.

---

**Need Help?** Run `make help` for a complete list of available commands, or check the component-specific README files for detailed documentation.
