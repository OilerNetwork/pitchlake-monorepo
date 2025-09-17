#!/bin/bash

# Script to send ETH on Katana devnet
# Usage: ./send_eth.sh <recipient_address> <amount_in_wei>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <recipient_address> <amount_in_wei>"
    echo "Example: $0 0x1234567890abcdef1234567890abcdef12345678 1000000000000000000"
    echo "Amount examples:"
    echo "  1 ETH = 1000000000000000000"
    echo "  0.1 ETH = 100000000000000000"
    echo "  0.01 ETH = 10000000000000000"
    exit 1
fi

RECIPIENT=$1
AMOUNT=$2

# ETH contract address on Starknet
ETH_CONTRACT="0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"

# Set environment variables for starkli
export STARKNET_RPC="http://localhost:5050"

echo "Sending $AMOUNT wei to $RECIPIENT"
echo "Using ETH contract: $ETH_CONTRACT"
echo "RPC endpoint: $STARKNET_RPC"

# Use starkli to send ETH
starkli invoke --watch $ETH_CONTRACT transfer $RECIPIENT $AMOUNT 0

echo "Transaction completed!"
