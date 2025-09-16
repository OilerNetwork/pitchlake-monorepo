# PitchLake Contract Deployment

This directory contains Go code for deploying PitchLake contracts to Starknet.

## Prerequisites

- Go 1.23+ installed
- Scarb installed for building contracts
- Starknet account with sufficient funds

## Environment Variables

Create a `.env` file in the contracts directory with the following variables (you can copy from `env.example`):

### Required Variables
- `STARKNET_DEPLOYER_ADDRESS`: Your Starknet account address
- `STARKNET_DEPLOYER_PRIVATE_KEY`: Your private key
- `STARKNET_DEPLOYER_PUBLIC_KEY`: Your public key
- `VERIFIER_ADDRESS`: Address of the verifier contract

### Optional Variables (with defaults)
- `RPC_URL`: RPC endpoint (default: https://starknet-sepolia.public.blastapi.io/rpc/v0_9)
- `ETH_ADDRESS`: ETH token address (default: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7)
- `STRIKE_LEVEL`: Strike level parameter (default: 0)
- `ALPHA`: Alpha parameter (default: 1000)
- `ROUND_TRANSITION_DURATION`: Round transition duration in seconds (default: 180)
- `AUCTION_DURATION`: Auction duration in seconds (default: 180)
- `ROUND_DURATION`: Round duration in seconds (default: 720)
- `PROGRAM_ID`: Program ID (default: 0x50495443485f4c414b455f5631)
- `PROVING_DELAY`: Proving delay (default: 0)

## Usage

From the contracts directory, run:

```bash
# Build contracts and deploy vault
make deploy-local
```

Or manually:

```bash
# Build contracts
scarb build

# Install Go dependencies
cd deployment
go mod tidy

# Run deployment
go run main.go
```

## Features

- Automatically declares OptionRound contract first (skips if already declared)
- Automatically handles Vault contract declaration (skips if already declared)
- Deploys Vault contract with configurable parameters
- Logs all important information (class hashes, addresses, transaction hashes)
- Uses UDC (Universal Deployer Contract) for deployment
- Supports both local and remote networks

## Output

The deployment script will output:
- Contract class hash
- Deployed contract address
- Transaction hash
- Deployment timestamp

You can use these values in your application configuration.
