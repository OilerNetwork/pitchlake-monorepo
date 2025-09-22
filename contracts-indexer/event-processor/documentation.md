# Event Processor - Technical Documentation

## Overview

The Event Processor is a sophisticated event processing system designed to handle Starknet blockchain events in real-time. It serves as the downstream processor for the Event Logger, listening to PostgreSQL database notifications and processing events to maintain up-to-date state for various DeFi components including vaults, liquidity providers, option rounds, and option buyers.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Event Logger  │───▶│   PostgreSQL     │───▶│ Event Processor │
│   (Juno Plugin) │    │   Database       │    │   (Go Service)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Database        │    │ State Updates   │
                       │ Triggers        │    │ & Notifications │
                       └─────────────────┘    └─────────────────┘
```

### Component Architecture

```
Event Processor
├── Main Application (main.go)
│   ├── Environment Loading
│   ├── Database Initialization
│   ├── Event Catchup
│   └── Event Listener
├── Database Layer (db/)
│   ├── Connection Management (db.go)
│   ├── Event Driver (driver.go)
│   ├── Forward Processing (forward.go)
│   ├── Notification Listener (listener.go)
│   ├── Block Reversion (revert.go)
│   └── Database Migrations (migrations/)
├── Data Models (models/)
│   ├── BigInt Handling (bigint.go)
│   ├── Core Models (models.go)
│   └── Data Unmarshaling (unmarshal.go)
└── Adapters (adaptors/)
    ├── PostgreSQL Adapter (pg.go)
    └── Utility Functions (utils.go)
```

## Database Schema

### Core Tables

The Event Processor works with the following database tables:

#### Events Table
```sql
CREATE TABLE "events" (
    event_nonce BIGINT NOT NULL,
    block_number numeric(78,0) NOT NULL,
    block_hash character varying(66) NOT NULL,
    vault_address character varying(255) NOT NULL,
    event_name character varying(255) NOT NULL,
    event_keys character varying(256)[] NOT NULL,
    event_data character varying(256)[] NOT NULL,
    transaction_hash character varying(66) NOT NULL
);
```

#### StarkNet Blocks Table
```sql
CREATE TABLE "starknet_blocks" (
    block_number numeric(78,0) NOT NULL PRIMARY KEY,
    block_hash character varying(66) NOT NULL,
    parent_hash character varying(66) NOT NULL,
    timestamp numeric(78,0) NOT NULL,
    status varchar(255) NOT NULL
);
```

#### Vault Registry Table
```sql
CREATE TABLE "vault_registry" (
    "id" SERIAL PRIMARY KEY,
    "vault_address" VARCHAR(66) NOT NULL,
    "deployed_at" VARCHAR(66) NOT NULL,
    "last_block_indexed" VARCHAR(66),
    "last_block_processed" VARCHAR(66)
);
```

#### Driver Events Table
```sql
CREATE TABLE "driver_events" (
    "id" SERIAL PRIMARY KEY,
    "sequence_index" BIGINT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "is_processed" BOOLEAN DEFAULT FALSE,
    "block_hash" VARCHAR(66),
    "start_block_hash" VARCHAR(66),
    "end_block_hash" VARCHAR(66),
    "vault_address" VARCHAR(66)
);
```

### State Tables

The system maintains state for various DeFi components:

#### Vaults Table
```sql
CREATE TABLE "vaults" (
    "id" SERIAL PRIMARY KEY,
    "address" VARCHAR(66) NOT NULL UNIQUE,
    "unlocked_balance" NUMERIC(78,0) DEFAULT 0,
    "locked_balance" NUMERIC(78,0) DEFAULT 0,
    "stashed_balance" NUMERIC(78,0) DEFAULT 0,
    "latest_block" NUMERIC(78,0),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Liquidity Providers Table
```sql
CREATE TABLE "liquidity_providers" (
    "id" SERIAL PRIMARY KEY,
    "vault_address" VARCHAR(66) NOT NULL,
    "address" VARCHAR(66) NOT NULL,
    "unlocked_balance" NUMERIC(78,0) DEFAULT 0,
    "locked_balance" NUMERIC(78,0) DEFAULT 0,
    "stashed_balance" NUMERIC(78,0) DEFAULT 0,
    "latest_block" NUMERIC(78,0),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vault_address, address)
);
```

#### Option Rounds Table
```sql
CREATE TABLE "option_rounds" (
    "id" SERIAL PRIMARY KEY,
    "vault_address" VARCHAR(66) NOT NULL,
    "address" VARCHAR(66) NOT NULL UNIQUE,
    "round_id" NUMERIC(78,0) NOT NULL,
    "cap_level" NUMERIC(78,0) DEFAULT 0,
    "auction_start_date" BIGINT,
    "auction_end_date" BIGINT,
    "option_settle_date" BIGINT,
    "starting_liquidity" NUMERIC(78,0) DEFAULT 0,
    "queued_liquidity" NUMERIC(78,0) DEFAULT 0,
    "remaining_liquidity" NUMERIC(78,0) DEFAULT 0,
    "available_options" NUMERIC(78,0) DEFAULT 0,
    "clearing_price" NUMERIC(78,0) DEFAULT 0,
    "settlement_price" NUMERIC(78,0) DEFAULT 0,
    "reserve_price" NUMERIC(78,0) DEFAULT 0,
    "strike_price" NUMERIC(78,0) DEFAULT 0,
    "options_sold" NUMERIC(78,0) DEFAULT 0,
    "unsold_liquidity" NUMERIC(78,0) DEFAULT 0,
    "round_state" VARCHAR(50),
    "premiums" NUMERIC(78,0) DEFAULT 0,
    "payout_per_option" NUMERIC(78,0) DEFAULT 0,
    "deployment_date" BIGINT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Option Buyers Table
```sql
CREATE TABLE "option_buyers" (
    "id" SERIAL PRIMARY KEY,
    "address" VARCHAR(66) NOT NULL,
    "round_address" VARCHAR(66) NOT NULL,
    "mintable_options" NUMERIC(78,0) DEFAULT 0,
    "has_minted" BOOLEAN DEFAULT FALSE,
    "has_refunded" BOOLEAN DEFAULT FALSE,
    "refundable_options" NUMERIC(78,0) DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address, round_address)
);
```

## Event Processing Flow

### Database Notification System

The Event Processor uses PostgreSQL's LISTEN/NOTIFY system for real-time event processing:

#### Notification Channels

1. **`starknet_blocks_insert`**: New block processed
2. **`starknet_blocks_revert`**: Block reverted
3. **`vault_insert`**: New vault registered
4. **`driver_events`**: Unified event notifications

#### Event Processing Steps

```
1. Database Trigger Fires
   ↓
2. PostgreSQL NOTIFY sent
   ↓
3. Event Processor receives notification
   ↓
4. Process event based on type
   ↓
5. Update application state
   ↓
6. Send downstream notifications
```

### Event Types

#### StartBlock Events
- **Trigger**: New block processing started
- **Action**: Initialize block processing state
- **Data**: Block hash, timestamp, block number

#### RevertBlock Events
- **Trigger**: Block reversion occurred
- **Action**: Revert affected state changes
- **Data**: Block hash, reversion details

#### CatchupVault Events
- **Trigger**: Vault catchup process initiated
- **Action**: Process historical events for vault
- **Data**: Vault address, start/end block hashes

## Database Operations

### Connection Management

The system uses connection pooling for optimal performance:

```go
type DB struct {
    Pool *pgxpool.Pool
    tx   pgx.Tx
    ctx  context.Context
    url  string
}
```

### Transaction Handling

All database operations use transactions for consistency:

```go
func (db *DB) BeginTx() {
    tx, err := db.Pool.Begin(context.TODO())
    if err != nil {
        log.Fatal(err)
    }
    db.tx = tx
}
```

### Event Processing

Events are processed with full transaction support:

```go
func (db *DB) ProcessEvent(event *Event) error {
    db.BeginTx()
    defer db.RollbackTx()
    
    // Process event logic
    err := db.updateState(event)
    if err != nil {
        return err
    }
    
    return db.CommitTx()
}
```

## Data Models

### Core Event Model

```go
type Event struct {
    ID              uint     `json:"id"`
    TransactionHash string   `json:"transaction_hash"`
    BlockNumber     uint64   `json:"block_number"`
    VaultAddress    string   `json:"vault_address"`
    Timestamp       uint64   `json:"timestamp"`
    EventName       string   `json:"event_name"`
    EventKeys       []string `json:"event_keys"`
    EventData       []string `json:"event_data"`
    EventNonce      int      `json:"event_nonce"`
}
```

### Vault State Model

```go
type VaultState struct {
    CurrentRound          BigInt `json:"currentRoundId"`
    CurrentRoundAddress   string `json:"currentRoundAddress"`
    UnlockedBalance       BigInt `json:"unlockedBalance"`
    LockedBalance         BigInt `json:"lockedBalance"`
    StashedBalance        BigInt `json:"stashedBalance"`
    Address               string `json:"address"`
    LatestBlock           BigInt `json:"latestBlock"`
    DeploymentDate        uint64 `json:"deploymentDate"`
    FossilClientAddress   string `json:"fossilClientAddress"`
    EthAddress            string `json:"ethAddress"`
    OptionRoundClassHash  string `json:"optionRoundClassHash"`
    Alpha                 BigInt `json:"alpha"`
    StrikeLevel           BigInt `json:"strikeLevel"`
    AuctionRunTime        uint64 `json:"auctionRunTime"`
    OptionRunTime         uint64 `json:"optionRunTime"`
    RoundTransitionPeriod uint64 `json:"roundTransitionPeriod"`
}
```

### Liquidity Provider State Model

```go
type LiquidityProviderState struct {
    VaultAddress    string `json:"vaultAddress"`
    Address         string `json:"address"`
    UnlockedBalance BigInt `json:"unlockedBalance"`
    LockedBalance   BigInt `json:"lockedBalance"`
    StashedBalance  BigInt `json:"stashedBalance"`
    LatestBlock     BigInt `json:"latestBlock"`
}
```

### Option Round Model

```go
type OptionRound struct {
    VaultAddress       string `json:"vaultAddress"`
    Address            string `json:"address"`
    RoundID            BigInt `json:"roundId"`
    CapLevel           BigInt `json:"capLevel"`
    AuctionStartDate   uint64 `json:"auctionStartDate"`
    AuctionEndDate     uint64 `json:"auctionEndDate"`
    OptionSettleDate   uint64 `json:"optionSettleDate"`
    StartingLiquidity  BigInt `json:"startingLiquidity"`
    QueuedLiquidity    BigInt `json:"queuedLiquidity"`
    RemainingLiquidity BigInt `json:"remainingLiquidity"`
    AvailableOptions   BigInt `json:"availableOptions"`
    ClearingPrice      BigInt `json:"clearingPrice"`
    SettlementPrice    BigInt `json:"settlementPrice"`
    ReservePrice       BigInt `json:"reservePrice"`
    StrikePrice        BigInt `json:"strikePrice"`
    OptionsSold        BigInt `json:"optionsSold"`
    UnsoldLiquidity    BigInt `json:"unsoldLiquidity"`
    RoundState         string `json:"roundState"`
    Premiums           BigInt `json:"premiums"`
    PayoutPerOption    BigInt `json:"payoutPerOption"`
    DeploymentDate     uint64 `json:"deploymentDate"`
}
```

### Option Buyer Model

```go
type OptionBuyer struct {
    Address           string `json:"address"`
    RoundAddress      string `json:"roundAddress"`
    MintableOptions   BigInt `json:"mintableOptions"`
    HasMinted         bool   `json:"hasMinted"`
    HasRefunded       bool   `json:"hasRefunded"`
    RefundableOptions BigInt `json:"refundableOptions"`
    Bids              []*Bid `json:"bids"`
}
```

## Configuration Management

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DB_URL` | Yes | PostgreSQL connection string | - |

### Configuration Validation

The system validates configuration before startup:

```go
func (cfg *Config) Validate() error {
    if cfg.DatabaseURL == "" {
        return errors.New("database URL is required")
    }
    return nil
}
```

## Performance Considerations

### Database Indexing

The system includes comprehensive indexing for optimal query performance:

```sql
-- Event table indexes
CREATE INDEX idx_events_block_number ON "events" (block_number);
CREATE INDEX idx_events_event_name ON "events" (event_name);
CREATE INDEX idx_events_vault_address ON "events" (vault_address);
CREATE INDEX idx_events_transaction_hash ON "events" (transaction_hash);

-- Block table indexes
CREATE INDEX idx_starknet_blocks_block_number ON "starknet_blocks" (block_number);
CREATE INDEX idx_starknet_blocks_parent_hash ON "starknet_blocks" (parent_hash);

-- Driver events indexes
CREATE INDEX idx_driver_events_sequence ON "driver_events" (sequence_index);
CREATE INDEX idx_driver_events_type ON "driver_events" (type);
CREATE INDEX idx_driver_events_is_processed ON "driver_events" (is_processed);
```

### Connection Pooling

Uses pgx connection pooling for efficient database access:

```go
config, err := pgxpool.ParseConfig(dbUrl)
if err != nil {
    return nil, fmt.Errorf("unable to parse connection string: %w", err)
}

pool, err := pgxpool.NewWithConfig(context.Background(), config)
```

### Batch Processing

Events are processed in batches to optimize database operations and reduce overhead.

## Error Handling

### Database Errors

All database operations include comprehensive error handling:

```go
func (db *DB) BeginTx() {
    tx, err := db.Pool.Begin(context.TODO())
    if err != nil {
        log.Printf("Transaction begin failed: %v", err)
        log.Fatal(err)
    }
    db.tx = tx
}
```

### Event Processing Errors

Event processing errors are logged and handled gracefully:

```go
func (db *DB) ProcessEvent(event *Event) error {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Event processing panic: %v", r)
            db.RollbackTx()
        }
    }()
    
    // Event processing logic
    return db.updateState(event)
}
```

## Monitoring and Observability

### Logging

The system provides comprehensive logging at multiple levels:

- **Application Level**: Startup, shutdown, and major operations
- **Event Level**: Event processing, state updates, error handling
- **Database Level**: Connection status, transaction handling

### Health Checks

Built-in health check capabilities:

```go
func (db *DB) HealthCheck() error {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    return db.Pool.Ping(ctx)
}
```

### Metrics

Key metrics to monitor:

- **Event Processing Rate**: Events processed per second
- **Database Connection Pool**: Active/idle connections
- **Error Rate**: Failed operations per minute
- **Processing Latency**: Time to process events

## Security Considerations

### Database Security

- Uses parameterized queries to prevent SQL injection
- Implements proper connection string handling
- Uses SSL connections in production

### Access Control

- Database access is restricted to necessary operations
- Service runs with minimal required permissions
- Environment variables are properly validated

## Deployment

### Local Development

```bash
# Set up environment
echo "DB_URL=postgres://pitchlake_user:pitchlake_password@pitchlake-db:5432/pitchlake?sslmode=disable" > .env

# Install dependencies
go mod download

# Run the service
go run main.go
```

### Production Deployment

Production deployment requires:

1. **Database Configuration**: Production PostgreSQL instance
2. **Security Configuration**: Proper SSL/TLS settings
3. **Monitoring Configuration**: Logging and metrics collection
4. **Environment Configuration**: Production environment variables

## Troubleshooting Guide

### Common Issues

#### Database Connection Issues

**Symptoms**: Service fails to start, database connection errors

**Solutions**:
1. Verify database is accessible
2. Check connection string format
3. Ensure database user has proper permissions

#### Event Processing Issues

**Symptoms**: Events not being processed, processing delays

**Solutions**:
1. Check database triggers are configured
2. Verify notification channels are working
3. Check event processor logs

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment variable
export DEBUG=true
go run main.go
```

### Log Analysis

Key log patterns to monitor:

- **Initialization**: Service startup and configuration loading
- **Event Processing**: Event reception and state updates
- **Database Operations**: Connection status and query execution
- **Error Patterns**: Failed operations and their causes

## Integration Points

### Event Logger Integration

The Event Processor receives events from the Event Logger through:

1. **Database Triggers**: PostgreSQL triggers fire on event insertion
2. **Notification System**: LISTEN/NOTIFY for real-time updates
3. **Event Queue**: Driver events table for reliable processing

### Backend Integration

The Event Processor provides processed data to the Backend through:

1. **State Tables**: Updated vault, LP, and option data
2. **Database Notifications**: Real-time state change notifications
3. **Event History**: Complete event processing history

### Support Server Integration

The Event Processor integrates with the Support Server through:

1. **State Updates**: Real-time state change notifications
2. **Event Notifications**: Processed event notifications
3. **Health Status**: Service health and status information

## Future Enhancements

### Planned Features

1. **Event Filtering**: More sophisticated event filtering capabilities
2. **Performance Optimization**: Additional caching and optimization layers
3. **Monitoring Integration**: Prometheus metrics and Grafana dashboards
4. **Multi-Network Support**: Support for multiple StarkNet networks
5. **Event Replay**: Capability to replay events from specific blocks

### Architecture Improvements

1. **Microservices**: Split into smaller, focused services
2. **Message Queues**: Use message queues for better decoupling
3. **Caching Layer**: Add Redis for frequently accessed data
4. **API Layer**: REST API for external integrations

## API Reference

### Database Models

#### Event Model

```go
type Event struct {
    ID              uint     `json:"id"`
    TransactionHash string   `json:"transaction_hash"`
    BlockNumber     uint64   `json:"block_number"`
    VaultAddress    string   `json:"vault_address"`
    Timestamp       uint64   `json:"timestamp"`
    EventName       string   `json:"event_name"`
    EventKeys       []string `json:"event_keys"`
    EventData       []string `json:"event_data"`
    EventNonce      int      `json:"event_nonce"`
}
```

#### Driver Event Model

```go
type DriverEvent struct {
    ID             uint      `json:"id"`
    SequenceIndex  int64     `json:"sequence_index"`
    Type           string    `json:"type"`
    Timestamp      time.Time `json:"timestamp"`
    IsProcessed    bool      `json:"is_processed"`
    BlockHash      *string   `json:"block_hash"`
    StartBlockHash *string   `json:"start_block_hash"`
    EndBlockHash   *string   `json:"end_block_hash"`
    VaultAddress   *string   `json:"vault_address"`
}
```

### Database Interface

#### Connection Management

```go
type DB struct {
    Pool *pgxpool.Pool
    tx   pgx.Tx
    ctx  context.Context
    url  string
}

func (db *DB) Init() error
func (db *DB) BeginTx()
func (db *DB) CommitTx() error
func (db *DB) RollbackTx()
func (db *DB) HealthCheck() error
```

#### Event Processing

```go
func (db *DB) CatchupDriverEvents() error
func (db *DB) Listener() error
func (db *DB) ProcessEvent(event *Event) error
func (db *DB) UpdateState(event *Event) error
```

## Conclusion

The Event Processor provides a robust, scalable solution for processing StarkNet blockchain events. Its event-driven architecture, comprehensive error handling, and real-time processing capabilities make it suitable for production use in the Pitchlake ecosystem.

For additional support or questions, refer to the main project documentation or contact the development team.
