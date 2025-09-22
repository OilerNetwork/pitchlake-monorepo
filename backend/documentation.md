# Pitchlake Backend Documentation

## Overview

The Pitchlake Backend is a high-performance WebSocket server built in Go that provides real-time blockchain data streaming for the Pitchlake platform. It serves as the core backend service handling gas price monitoring, vault state updates, and home dashboard data distribution.

## Architecture

### Core Components

```
backend/
├── main.go                 # Application entry point
├── server/                 # Server implementation
│   ├── server.go          # Main server setup and routing
│   ├── listener.go        # Database event listener
│   ├── api/               # API handlers and services
│   │   ├── general/       # Gas price and general endpoints
│   │   ├── home/          # Home dashboard endpoints
│   │   ├── vault/         # Vault-specific endpoints
│   │   ├── utils/         # Shared utilities
│   │   └── integrations/  # External service integrations
│   ├── types/             # Type definitions
│   └── validations/       # Request validation logic
├── db/                    # Database layer
│   ├── db.go             # Database connection management
│   └── repositories/     # Data access layer
├── models/               # Data models and structures
└── docker-compose.yml    # Container orchestration
```

### Server Architecture

The server follows a modular architecture with clear separation of concerns:

1. **HTTP Server**: Handles incoming WebSocket connections and HTTP requests
2. **Database Layer**: Manages PostgreSQL connections and data persistence
3. **API Layer**: Organized by domain (general, home, vault) with handlers and services
4. **Event Listener**: Monitors database changes and broadcasts updates to subscribers
5. **Subscriber Management**: Thread-safe management of WebSocket connections

## Database Integration

### Connection Management

The backend uses PostgreSQL with the `pgx` driver for high-performance database operations:

```go
type DB struct {
    Pool *pgxpool.Pool  // Connection pool for concurrent operations
    Conn *pgx.Conn      // Single connection for administrative tasks
}
```

### Database Triggers

The system relies on PostgreSQL triggers to detect data changes:

- **`lp_row_update`**: Triggers on liquidity provider state changes
- **`vault_update`**: Triggers on vault state changes  
- **`state_transition`**: Triggers on state field changes
- **`ob_update`**: Triggers on option buyer updates
- **`or_update`**: Triggers on option round updates

### Data Models

#### Core Entities

**VaultState**: Represents the current state of a vault
```go
type VaultState struct {
    CurrentRound          BigInt `json:"currentRoundId"`
    CurrentRoundAddress   string `json:"currentRoundAddress"`
    UnlockedBalance       BigInt `json:"unlockedBalance"`
    LockedBalance         BigInt `json:"lockedBalance"`
    StashedBalance        BigInt `json:"stashedBalance"`
    Address               string `json:"address"`
    LatestBlock           BigInt `json:"latestBlock"`
    // ... additional fields
}
```

**Block**: Blockchain block data with TWAP calculations
```go
type Block struct {
    BlockNumber   uint64 `json:"blockNumber"`
    Timestamp     uint64 `json:"timestamp"`
    BaseFee       string `json:"baseFee"`
    IsConfirmed   bool   `json:"isConfirmed"`
    TwelveMinTwap string `json:"twelveMinTwap"`
    ThreeHourTwap string `json:"threeHourTwap"`
    ThirtyDayTwap string `json:"thirtyDayTwap"`
}
```

**OptionRound**: Option round details and state
```go
type OptionRound struct {
    VaultAddress       string `json:"vaultAddress"`
    Address            string `json:"address"`
    RoundID            BigInt `json:"roundId"`
    CapLevel           BigInt `json:"capLevel"`
    AuctionStartDate   uint64 `json:"auctionStartDate"`
    AuctionEndDate     uint64 `json:"auctionEndDate"`
    // ... additional fields
}
```

## API Endpoints

### Available Endpoints

#### Health Check
- **Endpoint**: `GET /health`
- **Purpose**: Service health monitoring
- **Response**: HTTP 200 with "OK" body

#### Gas Price Subscription
- **Endpoint**: `WS /subscribeGas`
- **Purpose**: Real-time gas price data streaming
- **Request Schema**:
```json
{
  "startTimestamp": 1000,
  "endTimestamp": 2000,
  "roundDuration": 960
}
```

**Round Duration Options**:
- `960` - 12-minute TWAP
- `13200` - 3-hour TWAP
- `2631600` - 30-day TWAP

#### Home Dashboard Subscription
- **Endpoint**: `WS /subscribeHome`
- **Purpose**: Home dashboard data streaming
- **Features**: Aggregated vault data, market statistics

#### Vault Subscription
- **Endpoint**: `WS /subscribeVault`
- **Purpose**: Vault-specific state updates
- **Request Schema**:
```json
{
  "address": "0x...",
  "vaultAddress": "0x...",
  "userType": "user"
}
```

## WebSocket Implementation

### Connection Management

The server uses the `coder/websocket` library for efficient WebSocket handling:

```go
type SubscribersWithLock struct {
    List map[string]*websocket.Conn
    mu   sync.RWMutex
}
```

### Thread Safety

All subscriber operations are protected by mutexes to ensure thread safety:

- **Concurrent subscriber addition/removal**
- **Safe message broadcasting**
- **Race condition prevention**

### Message Buffering

Configurable message buffering for performance optimization:

```go
type GeneralRouter struct {
    subscriberMessageBuffer int           // Buffer size
    Subscribers            SubscribersWithLock
    log                    log.Logger
    pool                   pgxpool.Pool
}
```

## Event-Driven Architecture

### Database Listener

The `listener.go` implements a database event listener that:

1. **Monitors database triggers** for data changes
2. **Broadcasts updates** to relevant subscribers
3. **Manages subscription filtering** based on user context
4. **Handles connection lifecycle** events

### Subscription Filtering

Subscribers receive only relevant data based on:

- **Vault address** for vault-specific subscriptions
- **User address** for user-specific data
- **Time windows** for gas price data
- **User type** for access control

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PITCHLAKE_DB_URL` | PostgreSQL connection string | Required |
| `FRONTEND_URL` | Frontend URL for CORS | Optional (commented out in code) |

### Server Configuration

```go
type dbServer struct {
    subscriberMessageBuffer int
    db                      *db.DB
    log                     log.Logger
    serveMux                http.ServeMux
    ctx                     context.Context
    cancel                  context.CancelFunc
}
```

## Performance Features

### Connection Pooling

- **PostgreSQL connection pooling** with `pgxpool`
- **Configurable pool size** and timeout settings
- **Automatic connection health checks**

### Message Optimization

- **Buffered message delivery** to reduce network overhead
- **Selective broadcasting** to minimize unnecessary data transfer
- **Connection state management** for efficient resource usage

### Concurrency

- **Goroutine-based** concurrent request handling
- **Mutex-protected** shared state management
- **Context-based** cancellation and timeout handling

## Error Handling

### Connection Management

- **Graceful connection closure** with proper cleanup
- **Timeout handling** for long-running operations
- **Error recovery** mechanisms for transient failures

### Logging

- **Structured logging** for debugging and monitoring
- **Error context** preservation for troubleshooting
- **Performance metrics** collection

## Security Considerations

### Input Validation

- **Request schema validation** for all endpoints
- **SQL injection prevention** through parameterized queries
- **Type safety** enforcement through Go's type system

### Access Control

- **User type validation** for vault subscriptions
- **Address verification** for user-specific data
- **CORS configuration** for cross-origin requests

## Monitoring and Observability

### Health Checks

- **Database connectivity** monitoring
- **Service availability** endpoints
- **Connection count** tracking

### Metrics

- **Active subscriber count** per endpoint
- **Message throughput** statistics
- **Error rate** monitoring

## Development Workflow

### Testing Strategy

The backend includes comprehensive testing:

- **Unit tests** for individual components (40 tests)
- **Integration tests** for WebSocket functionality (4 tests)
- **Test coverage** reporting and analysis

### Build and Deployment

- **Docker containerization** for consistent deployment
- **Multi-stage builds** for optimized image size
- **Environment-specific** configuration management

## Dependencies

### Core Dependencies

- **Go 1.23+** - Programming language
- **github.com/coder/websocket** - WebSocket implementation
- **github.com/jackc/pgx/v5** - PostgreSQL driver
- **github.com/joho/godotenv** - Environment variable management

### Development Dependencies

- **github.com/stretchr/testify** - Testing framework
- **Docker** - Containerization
- **PostgreSQL** - Database

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Verify `PITCHLAKE_DB_URL` environment variable
   - Check PostgreSQL service status
   - Validate connection string format

2. **WebSocket Connection Issues**
   - Check CORS configuration
   - Verify frontend URL settings
   - Monitor connection limits

3. **Performance Issues**
   - Monitor connection pool usage
   - Check message buffer sizes
   - Analyze database query performance

### Debugging

- **Enable verbose logging** for detailed operation traces
- **Monitor database triggers** for event processing
- **Use race detection** during development (`go test -race`)

## Future Enhancements

### Planned Features

- **Rate limiting** for API endpoints
- **Metrics collection** with Prometheus integration
- **Distributed caching** with Redis
- **Message persistence** for offline subscribers
- **API versioning** support

### Scalability Considerations

- **Horizontal scaling** with load balancers
- **Database sharding** strategies
- **Message queue integration** for high throughput
- **Microservice decomposition** for specific domains
