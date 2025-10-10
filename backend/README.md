# Pitchlake WebSocket Server

A high-performance WebSocket server built in Go for real-time blockchain data streaming, specifically designed for gas price monitoring, vault state updates, and home dashboard data.

## 🚀 Features

- **Real-time WebSocket connections** for live data streaming
- **Gas price monitoring** with configurable time windows and TWAP calculations
- **Vault state management** with user-specific subscriptions
- **Home dashboard data** streaming
- **Concurrent subscriber management** with thread-safe operations
- **PostgreSQL integration** for data persistence
- **Health check endpoints** for monitoring
- **Comprehensive test coverage** for all API components

## ⚡ Quick Start

### Prerequisites
- Go 1.25+
- PostgreSQL database
- Docker (optional)

### Environment Setup
1. **Set up environment variables**
   ```bash
   export PITCHLAKE_DB_URL="postgres://username:password@localhost:5433/pitchlake?sslmode=disable"
   ```
   
   Note: `FRONTEND_URL` is referenced in the code but currently commented out.

2. **Install dependencies**
   ```bash
   go mod tidy
   ```

### Running the Server

#### Option 1: Using Makefile (Recommended)
```bash
# Build and run with default database URL (localhost:5433)
make build && make run

# Or run directly
make run
```

#### Option 2: Manual Build
```bash
# Build the application
go build -o pitchlake-backend .

# Run with custom database URL
export PITCHLAKE_DB_URL="your_database_url"
./pitchlake-backend
```

#### Option 3: Docker
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build -t pitchlake-backend .
docker run -p 8080:8080 -e PITCHLAKE_DB_URL="your_url" pitchlake-backend
```

### Verify Installation
```bash
# Check health endpoint
curl http://localhost:8080/health

# Expected response: HTTP 200 OK with "OK" body
```

## 🏗️ Architecture

The server follows a clean, modular architecture:

```
server/
├── api/
│   ├── general/          # Gas price and general data endpoints
│   ├── home/             # Home dashboard data endpoints  
│   ├── vault/            # Vault state and user data endpoints
│   ├── integrations/     # External service integrations (Fossil API)
│   └── utils/            # Shared utilities
├── types/                # Type definitions and interfaces
├── validations/          # Request validation logic
├── listener.go           # Database event listener
└── server.go             # Main server setup
```

## 📡 API Endpoints

### Available Endpoints
- **`/health`** - Health check endpoint (HTTP GET)
- **`/subscribeGas`** - WebSocket endpoint for gas price data
- **`/subscribeHome`** - WebSocket endpoint for home dashboard data
- **`/subscribeVault`** - WebSocket endpoint for vault state updates
- **`/sendJobRequest`** - HTTP endpoint for sending job requests to Fossil API

## 🔌 WebSocket Subscriptions

### Gas Data Subscription
Subscribe to real-time gas price data with configurable parameters:

```json
{
  "startTimestamp": 1000,
  "endTimestamp": 2000,
  "roundDuration": 960
}
```

**Round Duration Options:**
- `960` - 12-minute TWAP
- `13200` - 3-hour TWAP  
- `2631600` - 30-day TWAP

### Vault Subscription
Subscribe to vault-specific updates:

```json
{
  "address": "0x...",
  "vaultAddress": "0x...",
  "userType": "user"
}
```

## 🛠️ Development

### Prerequisites
- Go 1.25+
- PostgreSQL database
- Docker (optional, for containerized development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pitchlake-backend
   ```

2. **Install dependencies**
   ```bash
   go mod tidy
   ```

3. **Set up environment variables**
   ```bash
   # Set the database URL
   export PITCHLAKE_DB_URL="postgres://username:password@localhost:5433/pitchlake?sslmode=disable"
   ```

4. **Run the server**
   ```bash
   go run .
   ```

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build -t pitchlake-backend .
docker run -p 8080:8080 -e PITCHLAKE_DB_URL="your_database_url" pitchlake-backend
```

## 🧪 Testing

The project includes comprehensive test coverage with both unit and integration tests. All testing commands are available via Makefile for easy development.

### Test Commands

#### **Run All Tests**
```bash
# Using Makefile (recommended)
make test

# Raw Go command
go test ./...
```

#### **Unit Tests Only** (Fast Development)
```bash
# Using Makefile (recommended)
make test-unit

# Raw Go command
go test ./server/api/... ./server/validations/...
```

#### **Integration Tests Only**
```bash
# Using Makefile (recommended)
make test-integration

# Raw Go command
go test ./server/...
```

#### **Run Tests by Package**
```bash
# Vault API tests
go test ./server/api/vault/...
```

#### **Test Coverage**
```bash
# Using Makefile (recommended)
make test-coverage

# Raw Go command
go test -cover ./...

# Coverage by specific package
go test -cover ./server/validations/...
```

### Test Structure
```
Unit Tests:
├── server/api/general/     # Handler and service tests
├── server/api/home/        # Handler and service tests
├── server/api/vault/       # Handler, service, and job request tests
└── server/validations/     # Validation tests

Integration Tests:
└── server/integration_test.go  # WebSocket validation tests
```

## 📊 Data Models

### Core Types
- **`SubscriberGas`** - Gas price subscription data
- **`SubscriberVault`** - Vault subscription data  
- **`SubscriberHome`** - Home dashboard subscription data
- **`BlockResponse`** - Blockchain block data with TWAP values
- **`SubscriberMessage`** - General subscription message format
- **`BidData`** - Bid operation data

### Database Models
- **`Block`** - Blockchain block information
- **`VaultState`** - Current vault state
- **`LiquidityProviderState`** - Liquidity provider status
- **`OptionBuyer`** - Option buyer information
- **`OptionRound`** - Option round details
- **`Bid`** - Bid information
- **`QueuedLiquidity`** - Queued liquidity data
- **`TwapState`** - TWAP calculation state
- **`JobRequest`** - Fossil API job request data
- **`FossilRequest`** - Fossil API request format

## 🔒 Concurrency & Thread Safety

The server uses mutex-protected subscriber management to ensure thread-safe operations:

- **`SubscribersWithLock`** - Thread-safe subscriber collections
- **Concurrent subscriber addition/removal** - Safe for high-traffic scenarios
- **Message buffering** - Configurable buffer sizes for performance

## 📈 Performance Features

- **Message buffering** with configurable buffer sizes
- **Efficient WebSocket handling** using the `coder/websocket` library
- **Database connection pooling** with `pgx`
- **Graceful connection handling** with timeout management

## 🚨 Error Handling

- **Connection timeout management**
- **Graceful error recovery**
- **Comprehensive logging** for debugging

## 🔧 Configuration

Key configuration options:

```go
type GeneralRouter struct {
    subscriberMessageBuffer int           // Message buffer size
    Subscribers            SubscribersWithLock
    log                    log.Logger
    pool                   pgxpool.Pool
}
```

## 📚 Documentation

For detailed technical documentation, architecture details, and advanced configuration options, see:

- **[documentation.md](./documentation.md)** - Comprehensive technical documentation
- **[API Reference](./documentation.md#api-endpoints)** - Complete API endpoint documentation
- **[Database Schema](./documentation.md#data-models)** - Data models and database structure
- **[WebSocket Implementation](./documentation.md#websocket-implementation)** - Real-time communication details
