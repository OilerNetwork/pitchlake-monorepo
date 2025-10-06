# Event Logger - Technical Documentation

## Overview

The Event Logger is a sophisticated StarkNet event indexing system designed to capture, process, and store blockchain events in real-time. Built as a Juno plugin, it provides high-performance event logging with support for dynamic vault management, block reversion handling, and real-time notifications.

## System Architecture

### High-Level Architecture

<img width="615" height="246" alt="Screenshot 2025-09-23 at 12 29 45 AM" src="https://github.com/user-attachments/assets/cd8fe294-b1a4-4073-89c6-24d89f7ad32b" />


### Component Architecture

```
Event Logger Plugin
├── Plugin Core (plugin/core/)
│   ├── Configuration Management
│   ├── Component Orchestration
│   └── Lifecycle Management
├── Block Processor (plugin/block/)
│   ├── Block Processing Logic
│   ├── Event Extraction
│   └── State Management
├── Vault Manager (plugin/vault/)
│   ├── Vault Registry Management
│   ├── Catchup Logic
│   └── Event Filtering
├── Event Listener (plugin/listener/)
│   ├── Vault Registration Monitoring
│   └── Real-time Notifications
└── Database Layer (db/)
    ├── Connection Management
    ├── Transaction Handling
    └── Query Interface
```

## Database Schema

### Events Table

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

**Purpose**: Stores all StarkNet events with complete metadata.

**Key Features**:
- Supports large block numbers (78 digits)
- Array fields for event keys and data
- Indexed for efficient querying

### StarkNet Blocks Table

```sql
CREATE TABLE "starknet_blocks" (
    block_number numeric(78,0) NOT NULL PRIMARY KEY,
    block_hash character varying(66) NOT NULL,
    parent_hash character varying(66) NOT NULL,
    timestamp numeric(78,0) NOT NULL,
    status varchar(255) NOT NULL
);
```

**Purpose**: Tracks processed blocks and their status.

**Key Features**:
- Primary key on block_number
- Status tracking for reversion handling
- PostgreSQL triggers for notifications

### Vault Registry Table

```sql
CREATE TABLE "vault_registry" (
    "id" SERIAL PRIMARY KEY,
    "vault_address" VARCHAR(66) NOT NULL,
    "deployed_block_hash" VARCHAR(66) NOT NULL,
    "deployed_block_number" VARCHAR(66) NOT NULL,
    "last_block_indexed" VARCHAR(66),
    "last_block_processed" VARCHAR(66)
);
```

**Purpose**: Manages registered vaults and their indexing state.

**Key Features**:
- Tracks deployment block for each vault
- Maintains indexing progress
- Supports dynamic vault registration

### Driver Events Table

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

**Purpose**: Unified event notification system for external integrations.

**Event Types**:
- `StartBlock`: New block processing started
- `RevertBlock`: Block reversion occurred
- `CatchupVault`: Vault catchup process initiated

## Plugin Implementation

### Juno Plugin Interface

The Event Logger implements the `JunoPlugin` interface:

```go
type JunoPlugin interface {
    Init() error
    Shutdown() error
    NewBlock(block *core.Block, stateUpdate *core.StateUpdate, newClasses map[felt.Felt]core.Class) error
    RevertBlock(from, to *BlockAndStateUpdate, reverseStateDiff *core.StateDiff) error
}
```

### Plugin Lifecycle

1. **Initialization**:
   - Load configuration from environment variables
   - Initialize database connection
   - Set up network client
   - Initialize vault manager
   - Start event listener

2. **Block Processing**:
   - Receive new blocks from Juno
   - Extract events from transactions
   - Filter events by registered vaults
   - Store events and block data
   - Send notifications

3. **Block Reversion**:
   - Handle chain reorganizations
   - Revert affected events
   - Update block status
   - Send reversion notifications

4. **Shutdown**:
   - Stop event listener
   - Close database connections
   - Clean up resources

## Event Processing Flow

### New Block Processing

```
1. Juno receives new block
   ↓
2. Plugin receives block via NewBlock()
   ↓
3. Check if vaults are synced
   ↓
4. Process block for events
   ↓
5. Filter events by vault addresses
   ↓
6. Store events in database
   ↓
7. Update block status
   ↓
8. Send PostgreSQL notifications
   ↓
9. Update vault indexing state
```

### Vault Registration Flow

```
1. New vault added to registry
   ↓
2. PostgreSQL trigger fires
   ↓
3. Event listener receives notification
   ↓
4. Vault manager loads new vault
   ↓
5. Determine catchup requirements
   ↓
6. Initiate catchup process
   ↓
7. Process historical blocks
   ↓
8. Update vault state
```

### Block Reversion Flow

```
1. Chain reorganization detected
   ↓
2. Plugin receives RevertBlock()
   ↓
3. Identify affected blocks
   ↓
4. Revert events from reverted blocks
   ↓
5. Update block status to 'revert'
   ↓
6. Send reversion notifications
   ↓
7. Update vault indexing state
```

## Configuration Management

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `PITCHLAKE_DB_URL` | Yes | PostgreSQL connection string | - |
| `RPC_URL` | Yes | StarkNet RPC endpoint | - |
| `L1_URL` | Yes | Ethereum L1 RPC endpoint | - |
| `VAULT_HASH` | No | Vault contract class hash | - |
| `UDC_ADDRESS` | No | Universal Deployer Contract address | - |
| `DEPLOYER` | No | Deployer address | - |
| `CURSOR` | No | Starting block number | Latest |

### Configuration Validation

The system validates all required configuration before startup:

```go
func (cfg *Config) Validate() error {
    if cfg.DatabaseURL == "" {
        return errors.New("database URL is required")
    }
    if cfg.RPCURL == "" {
        return errors.New("RPC URL is required")
    }
    if cfg.L1URL == "" {
        return errors.New("L1 URL is required")
    }
    return nil
}
```

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

### Event Storage

Events are stored with full metadata:

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

## Real-time Notifications

### PostgreSQL LISTEN/NOTIFY

The system uses PostgreSQL's built-in notification system for real-time updates:

#### Block Notifications

```sql
-- Insert notification
CREATE OR REPLACE FUNCTION notify_insert_starknet_blocks()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('starknet_blocks_insert', NEW.block_number::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Vault Notifications

```sql
-- Vault registration notification
CREATE OR REPLACE FUNCTION notify_insert_registry()
RETURNS TRIGGER AS $$
BEGIN 
    PERFORM pg_notify('vault_insert', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Driver Event Notifications

```sql
-- Unified driver event notification
CREATE OR REPLACE FUNCTION notify_driver_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('driver_events', 
        json_build_object(
            'id', NEW.id,
            'sequence_index', NEW.sequence_index,
            'type', NEW.type,
            'timestamp', NEW.timestamp,
            'is_processed', NEW.is_processed,
            'block_hash', NEW.block_hash,
            'start_block_hash', NEW.start_block_hash,
            'end_block_hash', NEW.end_block_hash,
            'vault_address', NEW.vault_address
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
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
    }
    db.tx = tx
}
```

### Plugin Errors

Plugin errors are logged and propagated appropriately:

```go
func (p *pitchlakePlugin) Init() error {
    p.log = log.Default()
    p.log.Println("Initializing Pitchlake Plugin")

    pluginCoreInstance, err := pluginCore.NewPluginCore()
    if err != nil {
        return err
    }
    // ... rest of initialization
}
```

## Monitoring and Observability

### Logging

The system provides comprehensive logging at multiple levels:

- **Plugin Level**: Initialization, shutdown, and major operations
- **Component Level**: Block processing, vault management, event handling
- **Database Level**: Connection status, transaction handling

### Health Checks

Built-in health check commands:

```bash
make check-db              # Database connectivity
make network-status        # Network connectivity
make migrate-status        # Database schema status
```

### Metrics

Key metrics to monitor:

- **Block Processing Rate**: Blocks processed per second
- **Event Processing Rate**: Events processed per second
- **Database Connection Pool**: Active/idle connections
- **Vault Registration Rate**: New vaults registered per hour
- **Error Rate**: Failed operations per minute

## Security Considerations

### Database Security

- Uses parameterized queries to prevent SQL injection
- Implements proper connection string handling
- Uses SSL connections in production

### Network Security

- Validates all RPC endpoints
- Implements proper error handling for network failures
- Uses secure connection protocols

### Access Control

- Database access is restricted to necessary operations
- Plugin runs with minimal required permissions
- Environment variables are properly validated

## Deployment

### Docker Deployment

The system is containerized for easy deployment:

```dockerfile
# Multi-stage build for optimal image size
FROM ubuntu:24.04 AS build
# ... build dependencies and plugin

FROM ubuntu:24.04
# ... runtime dependencies and execution
```

### Environment Configuration

Production deployment requires:

1. **Database Configuration**: Production PostgreSQL instance
2. **Network Configuration**: Production RPC endpoints
3. **Security Configuration**: Proper SSL/TLS settings
4. **Monitoring Configuration**: Logging and metrics collection

### Scaling Considerations

- **Horizontal Scaling**: Multiple plugin instances can run against the same database
- **Database Scaling**: PostgreSQL can be scaled with read replicas
- **Network Scaling**: RPC endpoints should be load-balanced

## Troubleshooting Guide

### Common Issues

#### Database Connection Issues

**Symptoms**: Plugin fails to start, database connection errors

**Solutions**:
1. Verify fossil-monorepo is running: `cd ../../fossil-monorepo && make dev-up`
2. Check network connectivity: `make check-fossil-network`
3. Verify database credentials and connection string

#### Plugin Build Issues

**Symptoms**: Build failures, missing dependencies

**Solutions**:
1. Ensure Go 1.25.0+ is installed
2. Run `go mod tidy` to resolve dependencies
3. Check for missing environment variables

#### Event Processing Issues

**Symptoms**: Events not being captured, processing delays

**Solutions**:
1. Check vault registry: `make list-vaults`
2. Verify RPC endpoint connectivity
3. Check block processing status: `make list-blocks`

### Debug Mode

Enable debug mode for detailed logging:

```bash
VM_DEBUG=true make build
```

### Log Analysis

Key log patterns to monitor:

- **Initialization**: Plugin startup and configuration loading
- **Block Processing**: Block reception and event extraction
- **Database Operations**: Connection status and query execution
- **Error Patterns**: Failed operations and their causes

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

#### StarkNet Block Model

```go
type StarknetBlocks struct {
    BlockNumber uint64 `json:"block_number"`
    Timestamp   uint64 `json:"timestamp"`
    BlockHash   string `json:"block_hash"`
    ParentHash  string `json:"parent_hash"`
    Status      string `json:"status"`
}
```

#### Vault Registry Model

```go
type VaultRegistry struct {
    ID                  uint    `json:"id"`
    Address             string  `json:"address"`
    DeployedBlockHash   string  `json:"deployed_block_hash"`
    DeployedBlockNumber string  `json:"deployed_block_number"`
    LastBlockIndexed    *string `json:"last_block_indexed"`
    LastBlockProcessed  *string `json:"last_block_processed"`
}
```

### Plugin Interface

#### JunoPlugin Interface

```go
type JunoPlugin interface {
    Init() error
    Shutdown() error
    NewBlock(block *core.Block, stateUpdate *core.StateUpdate, newClasses map[felt.Felt]core.Class) error
    RevertBlock(from, to *BlockAndStateUpdate, reverseStateDiff *core.StateDiff) error
}
```

## Conclusion

The Event Logger provides a robust, scalable solution for StarkNet event indexing. Its modular architecture, comprehensive error handling, and real-time notification system make it suitable for production use in the Pitchlake ecosystem.

For additional support or questions, refer to the main project documentation or contact the development team.
