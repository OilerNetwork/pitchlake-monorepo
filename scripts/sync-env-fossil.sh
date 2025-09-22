#!/bin/bash

# =============================================================================
# SYNC FOSSIL CONTRACT ADDRESSES TO PITCHLAKE
# =============================================================================
# This script extracts deployed contract addresses from fossil-monorepo/.env.local
# and creates/updates the pitchlake repository's .env.local file with vault addresses
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FOSSIL_ENV_LOCAL="$PROJECT_ROOT/fossil-monorepo/.env.local"
FOSSIL_ENV_DOCKER="$PROJECT_ROOT/fossil-monorepo/.env.docker"
PITCHLAKE_ENV_EXAMPLE="$PROJECT_ROOT/.env.example"
PITCHLAKE_ENV_LOCAL="$PROJECT_ROOT/.env.local"
PITCHLAKE_ENV_DOCKER="$PROJECT_ROOT/.env"

echo -e "${BLUE}🔄 Syncing Fossil contract addresses to Pitchlake...${NC}"

# Check if fossil env files exist
if [ ! -f "$FOSSIL_ENV_LOCAL" ]; then
    echo -e "${RED}❌ Error: Fossil .env.local file not found at $FOSSIL_ENV_LOCAL${NC}"
    echo -e "${YELLOW}💡 Make sure fossil-monorepo has been deployed first with 'make dev-up'${NC}"
    exit 1
fi

if [ ! -f "$FOSSIL_ENV_DOCKER" ]; then
    echo -e "${RED}❌ Error: Fossil .env.docker file not found at $FOSSIL_ENV_DOCKER${NC}"
    echo -e "${YELLOW}💡 Make sure fossil-monorepo has been deployed first with 'make dev-up'${NC}"
    exit 1
fi

# Check if pitchlake .env.example exists
if [ ! -f "$PITCHLAKE_ENV_EXAMPLE" ]; then
    echo -e "${RED}❌ Error: Pitchlake .env.example file not found at $PITCHLAKE_ENV_EXAMPLE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found Fossil env files${NC}"

# Extract contract addresses from fossil .env.local
echo -e "${BLUE}📋 Extracting contract addresses...${NC}"

# Extract vault addresses from fossil .env.local
VAULT_12MIN=$(grep "^PITCHLAKE_VAULT_12MIN=" "$FOSSIL_ENV_LOCAL" | cut -d'=' -f2 | tr -d ' ')
VAULT_3H=$(grep "^PITCHLAKE_VAULT_3H=" "$FOSSIL_ENV_LOCAL" | cut -d'=' -f2 | tr -d ' ')
VAULT_1M=$(grep "^PITCHLAKE_VAULT_1M=" "$FOSSIL_ENV_LOCAL" | cut -d'=' -f2 | tr -d ' ')

# Extract StarkNet RPC URLs from both fossil files
STARKNET_RPC_LOCAL=$(grep "^STARKNET_RPC_URL=" "$FOSSIL_ENV_LOCAL" | cut -d'=' -f2 | tr -d ' ')
STARKNET_RPC_DOCKER=$(grep "^STARKNET_RPC_URL=" "$FOSSIL_ENV_DOCKER" | cut -d'=' -f2 | tr -d ' ')

#Extract Starknet Account Address and key
STARKNET_ACCOUNT_ADDRESS=$(grep "^STARKNET_ACCOUNT_ADDRESS=" "$FOSSIL_ENV_LOCAL" | cut -d'=' -f2 | tr -d ' ')
STARKNET_PRIVATE_KEY=$(grep "^STARKNET_PRIVATE_KEY=" "$FOSSIL_ENV_LOCAL" | cut -d'=' -f2 | tr -d ' ')

# Hardcode offchain processor URLs for both environments
OFFCHAIN_PROCESSOR_URL_LOCAL="http://localhost:3000"
OFFCHAIN_PROCESSOR_URL_DOCKER="http://offchain-processor:3000"

# Generate API key from Fossil
echo -e "${BLUE}🔑 Generating Fossil API key...${NC}"

# Wait a bit for services to be fully ready
echo -e "${BLUE}⏳ Waiting for Fossil services to be ready...${NC}"
sleep 3
# Try to generate API key with retries
for i in {1..3}; do
    echo -e "${BLUE}🔄 Attempt $i/3 to generate API key...${NC}"
    
    # Test if the service is responding
    if curl -s "http://localhost:3000/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Fossil service is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Fossil service not responding, trying anyway...${NC}"
    fi
    
    # Try to generate the API key
    RESPONSE=$(curl -s -X POST "http://localhost:3000/api_key" \
      -H "Content-Type: application/json" \
      -d '{"name": "pitchlake_key"}')
    
    echo -e "${BLUE}📋 Response: $RESPONSE${NC}"
    
    FOSSIL_API_KEY=$(echo "$RESPONSE" | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$FOSSIL_API_KEY" ]; then
        echo -e "${GREEN}✅ Generated Fossil API key${NC}"
        break
    else
        echo -e "${YELLOW}⚠️  Attempt $i failed, retrying...${NC}"
        sleep 3
    fi
done

if [ -z "$FOSSIL_API_KEY" ]; then
    echo -e "${RED}❌ Error: Failed to generate Fossil API key after 3 attempts${NC}"
    echo -e "${YELLOW}💡 Make sure Fossil services are running and accessible${NC}"
    exit 1
fi

# Validate that we got the addresses
if [ -z "$VAULT_12MIN" ] || [ -z "$VAULT_3H" ] || [ -z "$VAULT_1M" ]; then
    echo -e "${RED}❌ Error: Could not extract vault addresses from Fossil .env.local${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Extracted contract addresses:${NC}"
echo -e "   📦 12min Vault: ${YELLOW}$VAULT_12MIN${NC}"
echo -e "   📦 3h Vault: ${YELLOW}$VAULT_3H${NC}"
echo -e "   📦 1m Vault: ${YELLOW}$VAULT_1M${NC}"

# Create .env.local and .env.docker from .env.example (only if they don't exist)
echo -e "${BLUE}📝 Setting up .env.local and .env.docker files...${NC}"

# Create .env.local from .env.example if it doesn't exist
if [ ! -f "$PITCHLAKE_ENV_LOCAL" ]; then
    echo -e "${BLUE}   📄 Creating .env.local from .env.example...${NC}"
    cp "$PITCHLAKE_ENV_EXAMPLE" "$PITCHLAKE_ENV_LOCAL"
else
    echo -e "${GREEN}   ✅ .env.local already exists, preserving existing configuration${NC}"
fi

# Create .env.docker from .env.example if it doesn't exist
if [ ! -f "$PITCHLAKE_ENV_DOCKER" ]; then
    echo -e "${BLUE}   📄 Creating .env.docker from .env.example...${NC}"
    cp "$PITCHLAKE_ENV_EXAMPLE" "$PITCHLAKE_ENV_DOCKER"
else
    echo -e "${GREEN}   ✅ .env.docker already exists, preserving existing configuration${NC}"
fi

# Update both files with extracted addresses
echo -e "${BLUE}🔧 Updating .env.local and .env.docker with vault addresses...${NC}"

# Function to update or add environment variable
update_env_var() {
    local var_name="$1"
    local var_value="$2"
    local file="$3"
    
    if grep -q "^${var_name}=" "$file"; then
        # Update existing variable
        sed -i.bak "s|^${var_name}=.*|${var_name}=${var_value}|" "$file"
    else
        # Add new variable
        echo "${var_name}=${var_value}" >> "$file"
    fi
}

# Update vault addresses in both files
update_env_var "VAULT_ADDRESSES" "${VAULT_12MIN},${VAULT_3H},${VAULT_1M}" "$PITCHLAKE_ENV_LOCAL"
update_env_var "VAULT_ADDRESSES" "${VAULT_12MIN},${VAULT_3H},${VAULT_1M}" "$PITCHLAKE_ENV_DOCKER"
# update_env_var "STARKNET_ACCOUNT_ADDRESS" "$STARKNET_ACCOUNT_ADDRESS" "$PITCHLAKE_ENV_LOCAL"
# update_env_var "STARKNET_ACCOUNT_ADDRESS" "$STARKNET_ACCOUNT_ADDRESS" "$PITCHLAKE_ENV_DOCKER"
# update_env_var "STARKNET_PRIVATE_KEY" "$STARKNET_PRIVATE_KEY" "$PITCHLAKE_ENV_LOCAL"
# update_env_var "STARKNET_PRIVATE_KEY" "$STARKNET_PRIVATE_KEY" "$PITCHLAKE_ENV_DOCKER"
# Update RPC URLs - local for .env.local, docker for .env.docker
update_env_var "STARKNET_RPC" "$STARKNET_RPC_LOCAL" "$PITCHLAKE_ENV_LOCAL"
update_env_var "STARKNET_RPC" "$STARKNET_RPC_DOCKER" "$PITCHLAKE_ENV_DOCKER"

# Update API key in both files
update_env_var "FOSSIL_API_KEY" "$FOSSIL_API_KEY" "$PITCHLAKE_ENV_LOCAL"
update_env_var "FOSSIL_API_KEY" "$FOSSIL_API_KEY" "$PITCHLAKE_ENV_DOCKER"

# Update offchain processor URL - local from fossil, docker hardcoded
update_env_var "FOSSIL_API_URL" "$OFFCHAIN_PROCESSOR_URL_LOCAL" "$PITCHLAKE_ENV_LOCAL"
update_env_var "FOSSIL_API_URL" "$OFFCHAIN_PROCESSOR_URL_DOCKER" "$PITCHLAKE_ENV_DOCKER"

# Clean up backup files
rm -f "$PITCHLAKE_ENV_LOCAL.bak"
rm -f "$PITCHLAKE_ENV_DOCKER.bak"

echo -e "${GREEN}✅ Successfully updated .env.local and .env.docker with vault addresses, RPC URLs, API key, and offchain processor URL${NC}"
echo -e "${BLUE}📋 Updated variables:${NC}"
echo -e "   🔗 VAULT_ADDRESSES: ${YELLOW}${VAULT_12MIN},${VAULT_3H},${VAULT_1M}${NC}"
echo -e "   🌐 STARKNET_RPC (local): ${YELLOW}$STARKNET_RPC_LOCAL${NC}"
echo -e "   🐳 STARKNET_RPC (docker): ${YELLOW}$STARKNET_RPC_DOCKER${NC}"
echo -e "   🔑 FOSSIL_API_KEY: ${YELLOW}$FOSSIL_API_KEY${NC}"
echo -e "   📊 FOSSIL_API_URL (local): ${YELLOW}$OFFCHAIN_PROCESSOR_URL_LOCAL${NC}"
echo -e "   🐳 FOSSIL_API_URL (docker): ${YELLOW}$OFFCHAIN_PROCESSOR_URL_DOCKER${NC}"

echo -e "${GREEN}🎉 Contract addresses synced successfully!${NC}"
echo -e "${BLUE}💡 You can now start your Pitchlake services with the updated addresses.${NC}"
