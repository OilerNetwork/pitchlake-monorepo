package main

import (
	"context"
	"fmt"
	"math/big"
	"os"
	"time"

	"github.com/NethermindEth/juno/core/felt"
	"github.com/NethermindEth/starknet.go/account"
	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/NethermindEth/starknet.go/utils"
)

const (
	// Token addresses on devnet
	ETH_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
	STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
	
	// Funded wallet details
	FUNDER_ADDRESS = "0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec"
	FUNDER_PRIVATE_KEY = "0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912"
	FUNDER_PUBLIC_KEY = "0x33246ce85ebdc292e6a5c5b4dd51fab2757be34b8ffda847ca6925edf31cb67"
	
	// Amounts to send (in wei)
	ETH_AMOUNT = "1000000000000000000000"  // 1000 ETH
	STRK_AMOUNT = "1000000000000000000000" // 1000 STRK
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <token_type> <recipient_address>")
		fmt.Println("Token types: eth, strk")
		fmt.Println("Example: go run main.go eth 0x1234...")
		os.Exit(1)
	}

	tokenType := os.Args[1]
	recipientAddress := os.Args[2]

	if recipientAddress == "" {
		fmt.Println("❌ No recipient address provided")
		os.Exit(1)
	}

	// Get RPC URL from environment or use default
	rpcURL := os.Getenv("RPC_URL")
	if rpcURL == "" {
		rpcURL = "http://localhost:5050" // Default Katana devnet
	}

	fmt.Printf("🚀 Funding %s wallet with %s tokens...\n", recipientAddress, tokenType)
	fmt.Printf("📡 Using RPC: %s\n", rpcURL)

	// Initialize the funded account
	account, err := initializeAccount(rpcURL)
	if err != nil {
		fmt.Printf("❌ Failed to initialize account: %s\n", err)
		os.Exit(1)
	}

	// Determine token address and amount
	var tokenAddress, amount string
	switch tokenType {
	case "eth":
		tokenAddress = ETH_ADDRESS
		amount = ETH_AMOUNT
	case "strk":
		tokenAddress = STRK_ADDRESS
		amount = STRK_AMOUNT
	default:
		fmt.Printf("❌ Invalid token type: %s. Use 'eth' or 'strk'\n", tokenType)
		os.Exit(1)
	}

	// Send the transaction
	txHash, err := sendTokens(account, tokenAddress, recipientAddress, amount)
	if err != nil {
		fmt.Printf("❌ Failed to send tokens: %s\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ Tokens sent successfully!\n")
	fmt.Printf("   Transaction Hash: %s\n", txHash)
	fmt.Printf("   Recipient: %s\n", recipientAddress)
	fmt.Printf("   Amount: %s %s\n", amount, tokenType)
}

func initializeAccount(rpcURL string) (*account.Account, error) {
	// Initialize connection to RPC provider
	client, err := rpc.NewProvider(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("error connecting to RPC provider: %s", err)
	}

	// Initialize the account memkeyStore
	ks := account.NewMemKeystore()
	privKeyBI, ok := new(big.Int).SetString(FUNDER_PRIVATE_KEY, 0)
	if !ok {
		return nil, fmt.Errorf("failed to convert private key to big.Int")
	}
	ks.Put(FUNDER_PUBLIC_KEY, privKeyBI)

	// Convert account address to felt
	accountAddressInFelt, err := utils.HexToFelt(FUNDER_ADDRESS)
	if err != nil {
		return nil, fmt.Errorf("failed to transform account address: %s", err)
	}

	// Initialize the account (Cairo v2)
	accnt, err := account.NewAccount(client, accountAddressInFelt, FUNDER_PUBLIC_KEY, ks, account.CairoV2)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize account: %s", err)
	}

	return accnt, nil
}

func sendTokens(acc *account.Account, tokenAddress, recipientAddress, amount string) (string, error) {
	// Convert addresses to felt
	tokenAddressFelt, err := utils.HexToFelt(tokenAddress)
	if err != nil {
		return "", fmt.Errorf("invalid token address: %s", err)
	}

	recipientAddressFelt, err := utils.HexToFelt(recipientAddress)
	if err != nil {
		return "", fmt.Errorf("invalid recipient address: %s", err)
	}

	// Convert amount to felt
	amountBI, ok := new(big.Int).SetString(amount, 10)
	if !ok {
		return "", fmt.Errorf("invalid amount: %s", amount)
	}
	amountFelt := new(felt.Felt).SetBigInt(amountBI)

	// Build transfer calldata
	calldata := []*felt.Felt{
		recipientAddressFelt, // recipient
		amountFelt,           // amount
		new(felt.Felt).SetUint64(0), // data offset
	}

	// Build and send the transfer transaction
	resp, err := acc.BuildAndSendInvokeTxn(
		context.Background(),
		[]rpc.InvokeFunctionCall{
			{
				ContractAddress:    tokenAddressFelt,
				FunctionName: "transfer",
				CallData:           calldata,
			},
		},
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("failed to send transfer transaction: %s", err)
	}

	// Wait for transaction receipt
	fmt.Println("⏳ Waiting for transaction confirmation...")
	_, err = acc.WaitForTransactionReceipt(context.Background(), resp.Hash, time.Second)
	if err != nil {
		return "", fmt.Errorf("transfer transaction failed: %s", err)
	}

	return resp.Hash.String(), nil
}
