package main

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/NethermindEth/pitchlake/contracts/deployment"
	"github.com/joho/godotenv"
)

const (
	// Contract file paths relative to the deployment/ directory
	vaultSierraPath       = "../target/dev/pitch_lake_Vault.contract_class.json"
	vaultCasmPath         = "../target/dev/pitch_lake_Vault.compiled_contract_class.json"
	optionRoundSierraPath = "../target/dev/pitch_lake_OptionRound.contract_class.json"
	optionRoundCasmPath   = "../target/dev/pitch_lake_OptionRound.compiled_contract_class.json"

	// Network configuration
	networkName = "Starknet"
)

func main() {
	// Try to load .env from parent directory (contracts/)
	if err := godotenv.Load("../.env"); err != nil {
		// Fallback to current directory
		if err := godotenv.Load(); err != nil {
			fmt.Println("⚠️  No .env file found, using environment variables")
		}
	}

	fmt.Println("🚀 PitchLake Vault Contract Deployment Script")
	fmt.Println("=============================================")

	// Load environment variables
	accountAddress := os.Getenv("STARKNET_DEPLOYER_ADDRESS")
	accountPrivateKey := os.Getenv("STARKNET_DEPLOYER_PRIVATE_KEY")
	accountPublicKey := os.Getenv("STARKNET_DEPLOYER_PUBLIC_KEY")

	if accountAddress == "" || accountPrivateKey == "" || accountPublicKey == "" {
		fmt.Println("❌ Missing required environment variables:")
		fmt.Println("   STARKNET_DEPLOYER_ADDRESS: Your Starknet account address")
		fmt.Println("   STARKNET_DEPLOYER_PRIVATE_KEY: Your private key")
		fmt.Println("   STARKNET_DEPLOYER_PUBLIC_KEY: Your public key")
		os.Exit(1)
	}

	// Get network configuration from environment
	rpcURL := os.Getenv("LOCAL_RPC_URL")
	if rpcURL == "" {
		rpcURL = "http://localhost:5050/rpc" // default fallback
	}

	// Load vault configuration from environment
	vaultConfig, err := loadVaultConfig()
	if err != nil {
		fmt.Printf("❌ Failed to load vault configuration: %s\n", err)
		os.Exit(1)
	}

	fmt.Printf("📋 Network: %s\n", networkName)
	fmt.Printf("📋 RPC URL: %s\n", rpcURL)
	fmt.Printf("📋 Account: %s\n", accountAddress)
	fmt.Printf("📋 Vault Configuration:\n")
	fmt.Printf("   Verifier Address: %s\n", vaultConfig.VerifierAddress)
	fmt.Printf("   ETH Address: %s\n", vaultConfig.ETHAddress)
	fmt.Printf("   Option Round Class Hash: (will be declared automatically)\n")
	fmt.Printf("   Strike Level: %d\n", vaultConfig.StrikeLevel)
	fmt.Printf("   Alpha: %d\n", vaultConfig.Alpha)
	fmt.Printf("   Round Transition Duration: %d seconds\n", vaultConfig.RoundTransitionDuration)
	fmt.Printf("   Auction Duration: %d seconds\n", vaultConfig.AuctionDuration)
	fmt.Printf("   Round Duration: %d seconds\n", vaultConfig.RoundDuration)
	fmt.Printf("   Program ID: %s\n", vaultConfig.ProgramID)
	fmt.Printf("   Proving Delay: %d\n", vaultConfig.ProvingDelay)

	// Create deployer instance
	deployer, err := deployment.NewDeployer(rpcURL, accountAddress, accountPrivateKey, accountPublicKey)
	if err != nil {
		panic(fmt.Sprintf("❌ Failed to create deployer: %s", err))
	}

	fmt.Println("✅ Connected to Starknet RPC")

	// Deploy the contract
	result, err := deployer.DeployVault(vaultSierraPath, vaultCasmPath, optionRoundSierraPath, optionRoundCasmPath, vaultConfig)
	if err != nil {
		panic(fmt.Sprintf("❌ Deployment failed: %s", err))
	}

	fmt.Printf("✅ Contract deployed successfully!\n")
	fmt.Printf("   Deployed Address: %s\n", result.DeployedAddress)
	fmt.Printf("   Transaction Hash: %s\n", result.TransactionHash)

	fmt.Println("\n🎉 Vault deployment completed successfully!")
	fmt.Println("\n📋 Summary:")
	fmt.Printf("   Class Hash: %s\n", result.ClassHash)
	fmt.Printf("   Deployed Address: %s\n", result.DeployedAddress)
	fmt.Printf("   Transaction Hash: %s\n", result.TransactionHash)
	fmt.Printf("   Deployment Time: %s\n", result.DeploymentTime.Format(time.RFC3339))
}

// loadVaultConfig loads vault configuration from environment variables
func loadVaultConfig() (deployment.VaultConfig, error) {
	config := deployment.VaultConfig{}

	// Required environment variables
	config.VerifierAddress = os.Getenv("VERIFIER_ADDRESS")
	if config.VerifierAddress == "" {
		return config, fmt.Errorf("VERIFIER_ADDRESS environment variable is required")
	}

	// OptionRound class hash will be set automatically after declaration
	config.OptionRoundClassHash = ""

	// Optional environment variables with defaults
	config.ETHAddress = os.Getenv("ETH_ADDRESS")
	if config.ETHAddress == "" {
		config.ETHAddress = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
	}

	// Parse numeric values
	alphaStr := os.Getenv("ALPHA")
	if alphaStr == "" {
		config.Alpha = 1000 // default value
	} else {
		alpha, err := strconv.ParseUint(alphaStr, 10, 64)
		if err != nil {
			return config, fmt.Errorf("invalid ALPHA value: %s", err)
		}
		config.Alpha = alpha
	}

	strikeLevelStr := os.Getenv("STRIKE_LEVEL")
	if strikeLevelStr == "" {
		config.StrikeLevel = 0 // default value
	} else {
		strikeLevel, err := strconv.ParseUint(strikeLevelStr, 10, 64)
		if err != nil {
			return config, fmt.Errorf("invalid STRIKE_LEVEL value: %s", err)
		}
		config.StrikeLevel = strikeLevel
	}

	// Duration values (in seconds)
	roundTransitionDurationStr := os.Getenv("ROUND_TRANSITION_DURATION")
	if roundTransitionDurationStr == "" {
		config.RoundTransitionDuration = 180 // default 3 minutes
	} else {
		duration, err := strconv.ParseUint(roundTransitionDurationStr, 10, 64)
		if err != nil {
			return config, fmt.Errorf("invalid ROUND_TRANSITION_DURATION value: %s", err)
		}
		config.RoundTransitionDuration = duration
	}

	auctionDurationStr := os.Getenv("AUCTION_DURATION")
	if auctionDurationStr == "" {
		config.AuctionDuration = 180 // default 3 minutes
	} else {
		duration, err := strconv.ParseUint(auctionDurationStr, 10, 64)
		if err != nil {
			return config, fmt.Errorf("invalid AUCTION_DURATION value: %s", err)
		}
		config.AuctionDuration = duration
	}

	roundDurationStr := os.Getenv("ROUND_DURATION")
	if roundDurationStr == "" {
		config.RoundDuration = 720 // default 12 minutes
	} else {
		duration, err := strconv.ParseUint(roundDurationStr, 10, 64)
		if err != nil {
			return config, fmt.Errorf("invalid ROUND_DURATION value: %s", err)
		}
		config.RoundDuration = duration
	}

	// Program ID
	config.ProgramID = os.Getenv("PROGRAM_ID")
	if config.ProgramID == "" {
		config.ProgramID = "0x50495443485f4c414b455f5631" // PITCH_LAKE_V1
	}

	// Proving delay
	provingDelayStr := os.Getenv("PROVING_DELAY")
	if provingDelayStr == "" {
		config.ProvingDelay = 0 // default value
	} else {
		provingDelay, err := strconv.ParseUint(provingDelayStr, 10, 64)
		if err != nil {
			return config, fmt.Errorf("invalid PROVING_DELAY value: %s", err)
		}
		config.ProvingDelay = provingDelay
	}

	return config, nil
}
