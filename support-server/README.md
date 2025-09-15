# Architecture Support Server

A consolidated Node.js server that combines functionality from three separate repositories:
- **alchemy-indexer**: Ethereum block watcher and data collection
- **pitchlake-cron**: TWAP (Time-Weighted Average Price) calculations and updates
- **pitchlake-round-automator**: State transition automation for PitchLake options rounds

## Features

- **Block Watcher Service**: Monitors Ethereum blocks, collects gas data, and stores it in PostgreSQL
- **TWAP Service**: Calculates and updates time-weighted average prices for different time windows
- **State Transition Service**: Automates state transitions for PitchLake options rounds using StarkNet
- **Unified Logging**: Centralized logging with Winston across all services
- **Database Management**: Shared database connections for both Fossil and PitchLake databases
- **Graceful Shutdown**: Proper cleanup and shutdown handling for all services

## Project Structure

```
consolidated-server/
├── src/
│   ├── abi/                    # Smart contract ABIs
│   │   ├── vault.ts           # Vault contract ABI
│   │   └── optionRound.ts     # Option round contract ABI
│   ├── services/               # Core service implementations
│   │   ├── block-watcher.ts   # Ethereum block monitoring
│   │   ├── twap.ts            # TWAP calculations
│   │   └── state-transition.ts # Options round automation
│   ├── shared/                 # Shared utilities
│   │   ├── database.ts        # Database connection management
│   │   ├── logger.ts          # Logging configuration
│   │   └── types.ts           # Shared TypeScript types
│   └── index.ts               # Main server entry point
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Prerequisites

- Node.js 18+ 
- PostgreSQL databases (Fossil and PitchLake)
- StarkNet RPC access
- Ethereum mainnet RPC access

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following environment variables:

```env
# Database Connections
FOSSIL_DB_CONNECTION_STRING=postgresql://user:password@host:port/database
PITCHLAKE_DB_CONNECTION_STRING=postgresql://user:password@host:port/database

# Ethereum Configuration
MAINNET_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY

# StarkNet Configuration
STARKNET_RPC=https://starknet-mainnet.infura.io/v3/YOUR_PROJECT_ID
STARKNET_PRIVATE_KEY=your_private_key
STARKNET_ACCOUNT_ADDRESS=your_account_address
VAULT_ADDRESSES=vault1,vault2,vault3

# Fossil API Configuration
FOSSIL_API_KEY=your_fossil_api_key
FOSSIL_API_URL=https://api.fossil.com

# Cron Schedules
CRON_SCHEDULE=*/5 * * * * *  # Every 5 seconds for TWAP updates
CRON_SCHEDULE_STATE=*/30 * * * * *  # Every 30 seconds for state transitions

# Logging
LOG_LEVEL=info

# Optional: Demo mode
USE_DEMO_DATA=false
```

## Usage

### Development
```bash
npm run dev
```

### Development with watch mode
```bash
npm run dev:watch
```

### Production
```bash
npm run build
npm start
```

## Services

### Block Watcher Service
- Monitors Ethereum mainnet for new blocks
- Collects gas price, gas used, and other block data
- Stores data in Fossil database
- Handles block catch-up on startup

### TWAP Service
- Calculates time-weighted average prices for:
  - 12 minutes
  - 3 hours  
  - 30 days
- Updates TWAP values based on new block data
- Runs on configurable cron schedule

### State Transition Service
- Monitors PitchLake vault contracts
- Automates state transitions for options rounds
- Integrates with Fossil API for external data
- Supports multiple vault monitoring

## Database Schema

The server expects the following database tables:

### Fossil Database
- `block_data`: Ethereum block information
- `block_watcher_state`: Block processing state

### PitchLake Database  
- `twap_state`: TWAP calculation state and values

## API Endpoints

Currently, this is a background service with no HTTP API endpoints. All functionality runs as scheduled jobs and background processes.

## Monitoring and Logging

- All services use structured logging with Winston
- Log levels can be configured via `LOG_LEVEL` environment variable
- Each service has its own logger instance for easy identification

## Error Handling

- Graceful error handling across all services
- Automatic retry mechanisms for transient failures
- Comprehensive error logging with stack traces
- Graceful shutdown on SIGTERM/SIGINT

## Contributing

1. Follow the existing code structure
2. Add proper error handling and logging
3. Update types in `shared/types.ts` when adding new functionality
4. Ensure all services implement proper startup/shutdown methods

## License

[Add your license information here] 