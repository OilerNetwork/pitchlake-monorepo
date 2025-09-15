# Event Processor

A high-performance event processing system for Starknet blockchain events, built with Go and designed to handle vault operations, liquidity provider events, and option trading activities in real-time.

## Overview

The Event Processor is a robust service that listens to PostgreSQL database notifications for Starknet blockchain events and processes them to maintain up-to-date state for various DeFi components including:

- **Vaults**: Manages locked, unlocked, and stashed balances
- **Liquidity Providers**: Tracks LP positions and balances across vaults
- **Option Rounds**: Handles auction mechanics, pricing, and settlement
- **Option Buyers**: Manages option minting, refunds, and bid processing

## Architecture

The system is built around a PostgreSQL-based event-driven architecture:

```
Starknet Blockchain → Database Triggers → Event Processor → State Updates
```

### Core Components

- **Database Listener**: Listens to PostgreSQL notifications for block insertions and updates
- **Event Processor**: Processes blockchain events and updates application state
- **Transaction Management**: Handles atomic operations with rollback capabilities
- **State Recovery**: Automatically recovers from the latest processed block

## Features

- **Real-time Processing**: Listens to database notifications for immediate event processing
- **Atomic Operations**: Ensures data consistency with transaction rollback support
- **State Recovery**: Automatically resumes processing from the last known state
- **Block Reversion**: Handles blockchain reorganizations by reverting affected events
- **High Performance**: Built with Go for optimal performance and memory efficiency

## Prerequisites

- Go 1.24.1 or higher
- PostgreSQL 12+ with notification support
- Rust 1.85.0 (for VM components)
- Docker and Docker Compose (optional)

## Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event-processor
   ```

2. **Install Go dependencies**
   ```bash
   go mod download
   ```

3. **Install Rust toolchain**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   rustup install 1.85.0
   rustup default 1.85.0
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database configuration
   ```

5. **Build the application**
   ```bash
   make build
   ```

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Or build manually**
   ```bash
   docker build -t event-processor .
   docker run -e DB_URL="your-database-url" event-processor
   ```

## Configuration

### Environment Variables

- `DB_URL`: PostgreSQL connection string
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name

### Database Setup

The system expects the following database triggers to be configured:

- `lp_row_update`: Triggers on liquidity provider updates
- `vault_update`: Triggers on vault state changes
- `state_transition`: Triggers on state field changes
- `ob_update`: Triggers on option buyer updates
- `or_update`: Triggers on option round updates

## Usage

### Running the Service

```bash
# Run locally
./processor

# Run with Docker
docker-compose up

# Run with debug VM
VM_DEBUG=true make build
```

### Service Endpoints

The service runs on port 6060 by default and exposes:

- Health check endpoint (if implemented)
- Metrics endpoint (if implemented)

## Development

### Project Structure

```
event-processor/
├── adaptors/          # Data adapters and utilities
├── db/               # Database operations and listeners
├── models/           # Data models and structures
├── juno/             # Starknet integration components
├── main.go           # Application entry point
├── Dockerfile        # Container configuration
├── docker-compose.yml # Local development setup
└── Makefile          # Build and development tasks
```

### Building

```bash
# Standard build
make build

# Debug build with VM debugging
VM_DEBUG=true make build

# Build with specific version
VERSION=v1.0.0 make build
```

## Database Schema

The system works with the following key tables:

- `starknet_blocks`: Blockchain block information
- `events`: Processed blockchain events
- `vaults`: Vault state and configuration
- `liquidity_providers`: LP positions and balances
- `option_rounds`: Auction rounds and pricing
- `option_buyers`: Buyer positions and bids

## Monitoring and Logging

The service provides comprehensive logging for:

- Block processing events
- Event processing status
- Database transaction operations
- Error conditions and recovery
