# Event Processor

A high-performance event processing system for Starknet blockchain events, built with Go and designed to handle vault operations, liquidity provider events, and option trading activities in real-time.

## ⚡ Quick Start

### Prerequisites
- Go 1.25.0+
- PostgreSQL 12+ with notification support
- Access to fossil-monorepo network

### Environment Setup
1. **Set up environment variables**
   ```bash
   # Create .env file with database configuration
   echo "DB_URL=postgres://pitchlake_user:pitchlake_password@pitchlake-db:5432/pitchlake?sslmode=disable" > .env
   ```

2. **Install dependencies**
   ```bash
   go mod download
   ```

### Running the Service

#### Option 1: Direct Go Run
```bash
# Run the event processor
go run main.go
```

#### Option 2: Build and Run
```bash
# Build the application
go build -o event-processor .

# Run the binary
./event-processor
```

### Verify Installation
```bash
# Check if the service is running and processing events
# The service will start listening for database notifications
# Check logs for "Event processor started" message
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_URL` | PostgreSQL connection string | Yes |

## 🛠️ Development

### Building the Application

```bash
# Standard build
go build -o event-processor .

# Run with environment file
go run main.go
```

## 📚 Documentation

For detailed technical documentation, see:

- **[documentation.md](./documentation.md)** - Comprehensive technical documentation
- **[Database Schema](./documentation.md#database-schema)** - Complete database structure
- **[Event Processing](./documentation.md#event-processing)** - Event processing details
- **[API Reference](./documentation.md#api-reference)** - Internal API documentation
