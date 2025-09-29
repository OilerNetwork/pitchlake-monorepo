# Support Server - Technical Documentation

> **Quick Start**: For getting up and running quickly, see [README.md](./README.md)

## Overview

The Support Server is a consolidated Node.js application that provides essential background services for the Pitchlake ecosystem. This document provides comprehensive technical documentation for developers, system administrators, and contributors working with the support server.

**What's in this document:**
- Detailed architecture and service design
- Complete API reference and data models
- Database schema and migration details
- Development, deployment, and troubleshooting guides
- Security and performance considerations

## System Architecture

### High-Level Architecture

<img width="450" height="274" alt="Screenshot 2025-09-23 at 12 32 18 AM" src="https://github.com/user-attachments/assets/86c8050e-77e4-46c0-82b5-5c48e7bb9c0c" />


### Component Architecture

```
Support Server
├── Main Application (index.ts)
│   ├── Service Initialization
│   ├── Cron Job Scheduling
│   └── Graceful Shutdown
├── Services
│   ├── Confirmed TWAPs (confirmed-twaps/)
│   │   ├── Gas Data Service
│   │   ├── TWAP Calculations
│   │   └── Database Operations
│   ├── Unconfirmed TWAPs (unconfirmed-twaps/)
│   │   ├── Block Processor
│   │   ├── TWAP Service
│   │   └── Event Listener
│   ├── State Transition (state-transition/)
│   │   ├── State Handlers
│   │   ├── Vault Monitoring
│   │   └── Contract Interactions
│   └── Scheduler (scheduler/)
│       ├── Service Orchestration
│       └── Job Management
├── Shared Components (shared/)
│   ├── Database Connection
│   ├── Logging Configuration
│   └── Demo Data
└── Types & Utilities
    ├── TypeScript Definitions
    └── RPC Client
```

## Services

### Confirmed TWAPs Service

**Purpose**: Calculates time-weighted average prices for confirmed blockchain data.

**Key Components**:
- **GasDataService**: Manages gas price data collection and TWAP calculations
- **DatabaseService**: Handles database operations for TWAP storage
- **TWAP Windows**: Supports 12-minute, 3-hour, and 30-day calculations

**Configuration**:
```typescript
const WINDOW_CONFIGS = [
  {
    type: "twelve_min" as TWAPWindowType,
    duration: TWAP_RANGES.TWELVE_MIN,
    stateKey: "twelveminTwap" as const,
  },
  {
    type: "three_hour" as TWAPWindowType,
    duration: TWAP_RANGES.THREE_HOURS,
    stateKey: "threeHourTwap" as const,
  },
  {
    type: "thirty_day" as TWAPWindowType,
    duration: TWAP_RANGES.THIRTY_DAYS,
    stateKey: "thirtyDayTwap" as const,
  },
];
```

### Unconfirmed TWAPs Service

**Purpose**: Processes unconfirmed blockchain data for real-time TWAP updates.

**Key Components**:
- **UnconfirmedTWAPsRunner**: Main orchestrator for unconfirmed data processing
- **UnconfirmedBlockProcessor**: Processes individual blocks
- **UnconfirmedTWAPService**: Calculates TWAPs for unconfirmed data

**Features**:
- Real-time block processing
- Database notification listening
- Event-driven architecture

### State Transition Service

**Purpose**: Automates state transitions for PitchLake options rounds using StarkNet.

**Key Components**:
- **StateTransitionService**: Main service orchestrator
- **StateHandlers**: Handles different state transition types
- **Contract Integration**: Interacts with StarkNet vault and option round contracts

**Contract ABIs**:
- Vault Contract ABI
- Option Round Contract ABI
- ERC20 Token ABI

**State Management**:
```typescript
export enum OptionRoundState {
  Open = "Open",
  Auctioning = "Auctioning", 
  Running = "Running",
  Settled = "Settled"
}
```

### Scheduler Service

**Purpose**: Orchestrates service execution and manages cron jobs.

**Key Functions**:
- **runTWAPUpdate()**: Executes TWAP calculation updates
- **runStateTransition()**: Executes state transition checks
- **Service Coordination**: Manages service dependencies and execution order

## Database Schema

### Fossil Database

#### blockheaders Table
```sql
CREATE TABLE blockheaders (
    block_number BIGINT PRIMARY KEY,
    block_hash VARCHAR(66) NOT NULL,
    parent_hash VARCHAR(66) NOT NULL,
    timestamp BIGINT NOT NULL,
    gas_used BIGINT NOT NULL,
    gas_limit BIGINT NOT NULL,
    base_fee_per_gas BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: Stores Ethereum block information for TWAP calculations.

### PitchLake Database

#### twap_state Table
```sql
CREATE TABLE twap_state (
    id SERIAL PRIMARY KEY,
    window_type VARCHAR(50) NOT NULL,
    weighted_sum NUMERIC(78,0) DEFAULT 0,
    total_seconds BIGINT DEFAULT 0,
    is_confirmed BOOLEAN DEFAULT FALSE,
    twap_value NUMERIC(78,0) DEFAULT 0,
    last_block_number BIGINT,
    last_block_timestamp BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: Maintains TWAP calculation state and values.

#### driver_events Table
```sql
CREATE TABLE driver_events (
    id SERIAL PRIMARY KEY,
    sequence_index BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_processed BOOLEAN DEFAULT FALSE,
    block_hash VARCHAR(66),
    start_block_hash VARCHAR(66),
    end_block_hash VARCHAR(66),
    vault_address VARCHAR(66)
);
```

**Purpose**: Tracks system events and processing status.

## Configuration Management

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `FOSSIL_DB_URL` | Yes | Fossil database connection string | - |
| `PITCHLAKE_DB_URL` | Yes | PitchLake database connection string | - |
| `L1_ALCHEMY_URL` | Yes | Ethereum RPC endpoint | - |
| `STARKNET_RPC` | Yes | StarkNet RPC endpoint | - |
| `STARKNET_PRIVATE_KEY` | Yes | StarkNet private key | - |
| `STARKNET_ACCOUNT_ADDRESS` | Yes | StarkNet account address | - |
| `VAULT_ADDRESSES` | Yes | Comma-separated vault addresses | - |
| `FOSSIL_API_KEY` | Yes | Fossil API key | - |
| `FOSSIL_API_URL` | Yes | Fossil API URL | - |
| `USE_MOCK_VERIFIER` | No | Use mock verifier instead of Fossil API (uses automator's account) | `false` |
| `CRON_SCHEDULE` | No | TWAP update schedule | `*/5 * * * * *` |
| `CRON_SCHEDULE_STATE` | No | State transition schedule | `*/30 * * * * *` |
| `LOG_LEVEL` | No | Logging level | `info` |
| `USE_DEMO_DATA` | No | Enable demo mode | `false` |
| `IS_DEVNET` | No | Enable devnet mode (block mining) | `false` |
| `INITIAL_BLOCK_NUMBER` | No | Starting block for TWAP processing | `0` |
| `BLOCK_BATCH_SIZE` | No | Number of blocks to process in each batch | `500` |

### Development Environment Variables

#### `IS_DEVNET`
- **Purpose**: Enables devnet-specific behavior for testing and development
- **Behavior**: When set to `true`, the state transition service will mine blocks on Katana devnet to update timestamps for accurate testing
- **Usage**: Essential for local development with Katana to ensure proper timestamp progression
- **Code Location**: `stateHandlers.ts` - only executes block mining when `IS_DEVNET !== "true"`

#### `INITIAL_BLOCK_NUMBER`
- **Purpose**: Sets the starting block number for TWAP (Time-Weighted Average Price) data processing
- **Behavior**: 
  - If no previous TWAP state exists, processing starts from this block number
  - If previous state exists, processing resumes from the last processed block
  - Used by the gas data service to determine where to begin historical data processing
- **Usage**: Set to a recent block number to avoid processing the entire blockchain history
- **Code Location**: `gasData.ts` - used in TWAP calculation initialization

#### `BLOCK_BATCH_SIZE`
- **Purpose**: Controls the number of blocks processed in each batch during unconfirmed TWAP processing
- **Behavior**: 
  - Determines how many blocks are fetched and processed in a single batch
  - Larger values improve efficiency but may hit rate limits
  - Smaller values are more conservative but slower
- **Usage**: Adjust based on RPC provider rate limits and system performance
- **Code Location**: `runner.ts` - used in block processing loop

#### `USE_MOCK_VERIFIER`
- **Purpose**: Enables mock verifier mode for testing and development
- **Behavior**: 
  - When set to `true`, uses mock verifier instead of Fossil API for job requests
  - Uses the automator's own account address as the verifier
  - Bypasses actual Fossil API calls for testing purposes
  - Directly calls `fossil_callback()` on the vault contract
- **Usage**: Set to `true` for local testing without Fossil API dependency
- **Code Location**: `stateHandlers.ts` - determines which request function to call

#### Mock Verifier Implementation
When `USE_MOCK_VERIFIER=true`, the system bypasses the Fossil API and directly calls the `fossil_callback()` function on the vault contract. The mock verifier:

1. **Extracts data** from the original job request (vault address, program ID, timestamp ranges)
2. **Gets automator's address** from the vault contract provider (acts as the verifier)
3. **Calculates timestamp** using: `upper_bound + proving_delay + tolerance` (60 seconds)
4. **Uses hardcoded values** for pricing data:
   - Reserve Price: `34028236692093846346337460743176821145600000000`
   - TWAP: `680564733841876926926749214863536422912000000000`
   - Max Return: `113416112894748789872342756657008344878`
5. **Serializes data** into the required format for `fossil_callback()`
6. **Calls the vault** directly using the automator's account (which must be set as the verifier on the vault)

This allows for local testing without requiring the full Fossil infrastructure. The automator's account must be deployed as the verifier on the vault contract for this to work.

### Configuration Validation

The system validates all required configuration before startup:

```typescript
const requiredEnvVars = [
  'FOSSIL_DB_URL',
  'PITCHLAKE_DB_URL', 
  'L1_ALCHEMY_URL',
  'STARKNET_RPC',
  'STARKNET_PRIVATE_KEY',
  'STARKNET_ACCOUNT_ADDRESS',
  'VAULT_ADDRESSES',
  'FOSSIL_API_KEY',
  'FOSSIL_API_URL'
];

// Optional environment variables with defaults
const optionalEnvVars = {
  'IS_DEVNET': 'false',
  'INITIAL_BLOCK_NUMBER': '0',
  'CRON_SCHEDULE': '*/5 * * * * *',
  'CRON_SCHEDULE_STATE': '*/30 * * * * *',
  'LOG_LEVEL': 'info',
  'USE_DEMO_DATA': 'false'
};
```

## Data Models

### TWAP Models

```typescript
export interface TWAPState {
  windowType: TWAPWindowType;
  weightedSum: string;
  totalSeconds: BigInt;
  isConfirmed: boolean;
  twapValue: string;
  lastBlockNumber: number;
  lastBlockTimestamp: number;
}

export type TWAPWindowType = "twelve_min" | "three_hour" | "thirty_day";

export interface FormattedBlockData {
  blockNumber: number;
  timestamp: number;
  baseFeePerGas: string;
  gasUsed: string;
  gasLimit: string;
  nextTimestamp?: number;
}
```

### State Transition Models

```typescript
export interface JobRequest {
  vaultAddress: string;
  requestType: string;
  payload: any;
  timestamp: number;
}

export interface JobStatus {
  success: boolean;
  message: string;
  transactionHash?: string;
}

export enum OptionRoundState {
  Open = "Open",
  Auctioning = "Auctioning",
  Running = "Running", 
  Settled = "Settled"
}
```

### Database Models

```typescript
export interface Block {
  blockNumber: number;
  blockHash: string;
  parentHash: string;
  timestamp: number;
  gasUsed: number;
  gasLimit: number;
  baseFeePerGas: number;
}

export interface DriverEvent {
  id: number;
  sequenceIndex: number;
  type: string;
  timestamp: Date;
  isProcessed: boolean;
  blockHash?: string;
  startBlockHash?: string;
  endBlockHash?: string;
  vaultAddress?: string;
}
```

## Service Integration

### Database Integration

The Support Server integrates with two PostgreSQL databases:

1. **Fossil Database**: Stores blockchain data (blocks, gas prices)
2. **PitchLake Database**: Stores application state (TWAPs, events)

**Connection Management**:
```typescript
export class DB {
  private fossilPool: Pool;
  private pitchlakePool: Pool;
  
  constructor() {
    this.fossilPool = new Pool({
      connectionString: process.env.FOSSIL_DB_URL
    });
    this.pitchlakePool = new Pool({
      connectionString: process.env.PITCHLAKE_DB_URL
    });
  }
}
```

### StarkNet Integration

The service interacts with StarkNet contracts for state transitions:

```typescript
export class StateTransitionService {
  private provider: RpcProvider;
  private account: Account;
  
  constructor(provider: RpcProvider) {
    this.provider = provider;
    this.account = new Account(
      provider,
      STARKNET_ACCOUNT_ADDRESS!,
      STARKNET_PRIVATE_KEY!
    );
  }
}
```

### Ethereum Integration

The service monitors Ethereum blocks for gas price data:

```typescript
export class GasDataService {
  private rpcClient: RpcClient;
  
  async getLatestBlocks(count: number): Promise<FormattedBlockData[]> {
    // Fetch blocks from Ethereum RPC
  }
}
```

## Performance Considerations

### Database Optimization

**Connection Pooling**:
- Uses connection pooling for both databases
- Configurable pool sizes based on workload
- Automatic connection management

**Query Optimization**:
- Indexed queries for TWAP calculations
- Batch processing for large datasets
- Prepared statements for repeated queries

### Memory Management

**TWAP Calculations**:
- Streaming data processing for large time windows
- Efficient data structures for weighted averages
- Garbage collection optimization

**Event Processing**:
- Event queue management
- Memory-efficient event handling
- Buffer management for real-time data

### Caching Strategy

**TWAP Caching**:
- In-memory caching of recent TWAP values
- Redis integration for distributed caching (future)
- Cache invalidation strategies

## Error Handling

### Service-Level Error Handling

```typescript
class ArchitectureSupportServer {
  async start(): Promise<void> {
    try {
      await Promise.all([
        runner.initialize(),
        runTWAPUpdate()(),
        runStateTransition()()
      ]);
      logger.info('All services started successfully');
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }
}
```

### Database Error Handling

```typescript
export class DatabaseService {
  async executeQuery(query: string, params: any[]): Promise<any> {
    try {
      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Database query failed:', { query, error });
      throw new DatabaseError('Query execution failed', error);
    }
  }
}
```

### StarkNet Error Handling

```typescript
export class StateTransitionService {
  async executeTransaction(call: any): Promise<JobStatus> {
    try {
      const result = await this.account.execute(call);
      return {
        success: true,
        message: 'Transaction executed successfully',
        transactionHash: result.transaction_hash
      };
    } catch (error) {
      logger.error('StarkNet transaction failed:', error);
      return {
        success: false,
        message: `Transaction failed: ${error.message}`
      };
    }
  }
}
```

## Monitoring and Observability

### Logging

The system uses Winston for structured logging:

```typescript
export const setupLogger = (service: string): Logger => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service },
    transports: [
      new winston.transports.File({ filename: `logs/${service}.log` }),
      new winston.transports.Console()
    ]
  });
};
```

### Health Checks

**Database Health**:
```typescript
export class HealthChecker {
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.db.fossilPool.query('SELECT 1');
      await this.db.pitchlakePool.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}
```

**Service Health**:
- TWAP calculation status
- State transition service status
- RPC endpoint connectivity
- Contract interaction status

### Metrics

Key metrics to monitor:

- **TWAP Calculation Rate**: TWAPs calculated per minute
- **Block Processing Rate**: Blocks processed per second
- **State Transition Success Rate**: Successful transitions per hour
- **Database Connection Pool**: Active/idle connections
- **Error Rate**: Failed operations per minute
- **RPC Call Latency**: Average response time for RPC calls

## Security Considerations

### Private Key Management

- Environment variable storage for private keys
- No hardcoded credentials in source code
- Secure key rotation procedures
- Access control for environment files

### Database Security

- Connection string encryption
- SQL injection prevention through parameterized queries
- Database user privilege restriction
- Network access controls

### API Security

- RPC endpoint authentication
- Rate limiting for external API calls
- Request/response validation
- Error message sanitization

## Deployment

### Docker Deployment

The service includes Docker configuration for easy deployment:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Configuration

**Development**:
```bash
# Start databases
make dev

# Run in development mode
npm run dev
```

**Devnet Development**:
```bash
# Set devnet environment variables
export IS_DEVNET=true
export INITIAL_BLOCK_NUMBER=9263962

# Start with devnet configuration
make dev
```

**Key Devnet Features**:
- Block mining for timestamp updates
- Historical data processing from specific block
- Katana integration for local testing

**Production**:
```bash
# Build application
npm run build

# Start with production configuration
NODE_ENV=production npm start
```

### Database Migrations

The system includes migration scripts for database setup:

```bash
# Run all migrations
make migrate-all

# Check migration status
make check-migrations

# Rollback migrations (if needed)
make migrate-down
```

## Troubleshooting Guide

### Common Issues

#### Database Connection Issues

**Symptoms**: Service fails to start, database connection errors

**Solutions**:
1. Verify database services are running: `make check-dbs`
2. Check connection strings in environment variables
3. Verify database user permissions
4. Check network connectivity to database hosts

#### TWAP Calculation Issues

**Symptoms**: TWAP values not updating, calculation errors

**Solutions**:
1. Check Ethereum RPC endpoint connectivity
2. Verify block data integrity in database
3. Check TWAP calculation logic for edge cases
4. Monitor memory usage during calculations

#### State Transition Issues

**Symptoms**: State transitions not executing, StarkNet errors

**Solutions**:
1. Verify StarkNet RPC endpoint connectivity
2. Check account balance and permissions
3. Validate contract addresses and ABIs
4. Monitor transaction fees and network congestion

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment variables
export LOG_LEVEL=debug
export NODE_ENV=development

# Run with debug logging
npm run dev
```

### Log Analysis

Key log patterns to monitor:

- **Service Startup**: Service initialization and configuration loading
- **TWAP Updates**: TWAP calculation execution and results
- **State Transitions**: Contract interactions and transaction results
- **Database Operations**: Query execution and connection status
- **Error Patterns**: Failed operations and their causes

## Future Enhancements

### Planned Features

1. **Metrics Dashboard**: Prometheus/Grafana integration for monitoring
2. **API Endpoints**: REST API for external integrations
3. **Event Replay**: Capability to replay events from specific blocks
4. **Multi-Network Support**: Support for multiple StarkNet networks
5. **Advanced Caching**: Redis integration for distributed caching

### Architecture Improvements

1. **Microservices**: Split into smaller, focused services
2. **Message Queues**: Use message queues for better decoupling
3. **Load Balancing**: Horizontal scaling capabilities
4. **Circuit Breakers**: Fault tolerance improvements
5. **Configuration Management**: External configuration management

## API Reference

### Internal Service APIs

#### TWAP Service API

```typescript
interface TWAPServiceAPI {
  updateTWAPs(): Promise<number>;
  calculateTWAP(state: TWAPState, blocks: FormattedBlockData[]): TWAPState;
  getLatestTWAP(windowType: TWAPWindowType): Promise<TWAPState>;
}
```

#### State Transition Service API

```typescript
interface StateTransitionServiceAPI {
  runStateTransition(): Promise<void>;
  handleVaultState(vaultAddress: string): Promise<JobStatus>;
  executeStateTransition(request: JobRequest): Promise<JobStatus>;
}
```

#### Database Service API

```typescript
interface DatabaseServiceAPI {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeQuery(query: string, params: any[]): Promise<any>;
  getLatestBlocks(count: number): Promise<FormattedBlockData[]>;
}
```

## Conclusion

The Support Server provides a robust, scalable solution for background services in the Pitchlake ecosystem. Its modular architecture, comprehensive error handling, and real-time processing capabilities make it suitable for production use with high availability requirements.

For additional support or questions, refer to the main project documentation or contact the development team.
