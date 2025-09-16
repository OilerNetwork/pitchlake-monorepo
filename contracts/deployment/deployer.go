package deployment

import (
	"context"
	"fmt"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/NethermindEth/juno/core/felt"
	"github.com/NethermindEth/starknet.go/account"
	"github.com/NethermindEth/starknet.go/contracts"
	"github.com/NethermindEth/starknet.go/hash"
	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/NethermindEth/starknet.go/utils"
)

// Deployer handles contract deployment
type Deployer struct {
	account *account.Account
	client  *rpc.Provider
}

// NewDeployer creates a new deployment instance
func NewDeployer(rpcURL string, accountAddress, privateKey, publicKey string) (*Deployer, error) {
	// Initialize connection to RPC provider
	client, err := rpc.NewProvider(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("error connecting to RPC provider: %s", err)
	}

	// Initialize the account memkeyStore
	ks := account.NewMemKeystore()
	privKeyBI, ok := new(big.Int).SetString(privateKey, 0)
	if !ok {
		return nil, fmt.Errorf("failed to convert private key to big.Int")
	}
	ks.Put(publicKey, privKeyBI)

	// Convert account address to felt
	accountAddressInFelt, err := utils.HexToFelt(accountAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to transform account address: %s", err)
	}

	// Initialize the account (Cairo v2)
	accnt, err := account.NewAccount(client, accountAddressInFelt, publicKey, ks, account.CairoV2)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize account: %s", err)
	}

	return &Deployer{
		account: accnt,
		client:  client,
	}, nil
}

// DeployVault deploys the Vault contract
func (d *Deployer) DeployVault(vaultSierraPath, vaultCasmPath, optionRoundSierraPath, optionRoundCasmPath string, vaultConfig VaultConfig) (*DeploymentResult, error) {
	// Step 1: Declare the OptionRound contract
	fmt.Println("\n📋 Step 1: Declaring OptionRound contract...")
	optionRoundClassHash, err := d.declareContract(optionRoundSierraPath, optionRoundCasmPath)
	if err != nil {
		return nil, fmt.Errorf("option round declaration failed: %s", err)
	}
	fmt.Printf("✅ OptionRound declaration completed! Class Hash: %s\n", optionRoundClassHash)

	// Update the vault config with the declared OptionRound class hash
	vaultConfig.OptionRoundClassHash = optionRoundClassHash

	// Step 2: Declare the Vault contract
	fmt.Println("\n📋 Step 2: Declaring Vault contract...")
	vaultClassHash, err := d.declareContract(vaultSierraPath, vaultCasmPath)
	if err != nil {
		return nil, fmt.Errorf("vault declaration failed: %s", err)
	}
	fmt.Printf("✅ Vault declaration completed! Class Hash: %s\n", vaultClassHash)

	// Step 3: Deploy the Vault contract
	fmt.Println("\n📋 Step 3: Deploying Vault contract...")
	deployedAddress, txHash, err := d.deployVaultContract(vaultClassHash, vaultConfig)
	if err != nil {
		return nil, fmt.Errorf("deployment failed: %s", err)
	}

	fmt.Printf("✅ Contract deployed successfully!\n")
	fmt.Printf("   Deployed Address: %s\n", deployedAddress)
	fmt.Printf("   Transaction Hash: %s\n", txHash)

	return &DeploymentResult{
		ClassHash:       vaultClassHash,
		DeployedAddress: deployedAddress,
		TransactionHash: txHash,
		DeploymentTime:  time.Now(),
	}, nil
}

// declareContract declares the contract
func (d *Deployer) declareContract(sierraPath, casmPath string) (string, error) {
	fmt.Printf("📋 Loading contract files:\n")
	fmt.Printf("   Sierra: %s\n", sierraPath)
	fmt.Printf("   Casm: %s\n", casmPath)

	// Check if contract files exist
	if _, err := os.Stat(sierraPath); os.IsNotExist(err) {
		return "", fmt.Errorf("sierra contract file not found: %s", sierraPath)
	}
	if _, err := os.Stat(casmPath); os.IsNotExist(err) {
		return "", fmt.Errorf("casm contract file not found: %s", casmPath)
	}

	// Unmarshalling the casm contract class from a JSON file
	casmClass, err := utils.UnmarshalJSONFileToType[contracts.CasmClass](casmPath, "")
	if err != nil {
		return "", fmt.Errorf("failed to parse casm contract: %s", err)
	}

	// Unmarshalling the sierra contract class from a JSON file
	contractClass, err := utils.UnmarshalJSONFileToType[contracts.ContractClass](sierraPath, "")
	if err != nil {
		return "", fmt.Errorf("failed to parse sierra contract: %s", err)
	}

	// Building and sending the declare transaction
	fmt.Println("📤 Declaring contract...")
	resp, err := d.account.BuildAndSendDeclareTxn(
		context.Background(),
		casmClass,
		contractClass,
		nil,
	)
	if err != nil {
		// Check if it's an "already declared" error
		if strings.Contains(err.Error(), "already declared") {
			fmt.Println("✅ Contract already declared, extracting class hash...")
			// Use the proper ClassHash function from the hash package
			classHash := hash.ClassHash(contractClass)
			return classHash.String(), nil
		}
		return "", err
	}

	// Wait for transaction receipt
	fmt.Println("⏳ Waiting for declaration confirmation...")
	_, err = d.account.WaitForTransactionReceipt(context.Background(), resp.Hash, time.Second)
	if err != nil {
		return "", fmt.Errorf("declare transaction failed: %s", err)
	}

	return resp.ClassHash.String(), nil
}

// deployVaultContract deploys the Vault contract with constructor arguments
func (d *Deployer) deployVaultContract(classHash string, config VaultConfig) (string, string, error) {
	// Convert class hash to felt
	classHashFelt, err := utils.HexToFelt(classHash)
	if err != nil {
		return "", "", fmt.Errorf("invalid class hash: %s", err)
	}

	// Build constructor calldata for Vault
	constructorCalldata, err := d.buildVaultConstructorCalldata(config)
	if err != nil {
		return "", "", fmt.Errorf("failed to build constructor calldata: %s", err)
	}

	fmt.Println("📤 Sending deployment transaction...")

	// Deploy the contract with UDC
	resp, salt, err := d.account.DeployContractWithUDC(context.Background(), classHashFelt, constructorCalldata, nil, nil)
	if err != nil {
		return "", "", fmt.Errorf("failed to deploy contract: %s", err)
	}

	// Extract transaction hash from response
	txHash := resp.Hash
	fmt.Printf("⏳ Transaction sent! Hash: %s\n", txHash.String())
	fmt.Println("⏳ Waiting for transaction confirmation...")

	// Wait for transaction receipt
	txReceipt, err := d.account.WaitForTransactionReceipt(context.Background(), txHash, time.Second)
	if err != nil {
		return "", "", fmt.Errorf("failed to get transaction receipt: %s", err)
	}

	fmt.Printf("✅ Transaction confirmed!\n")
	fmt.Printf("   Execution Status: %s\n", txReceipt.ExecutionStatus)
	fmt.Printf("   Finality Status: %s\n", txReceipt.FinalityStatus)

	// Compute the deployed contract address
	deployedAddress := utils.PrecomputeAddressForUDC(classHashFelt, salt, constructorCalldata, utils.UDCCairoV0, d.account.Address)

	return deployedAddress.String(), txHash.String(), nil
}

// buildVaultConstructorCalldata builds the constructor calldata for Vault contract
func (d *Deployer) buildVaultConstructorCalldata(config VaultConfig) ([]*felt.Felt, error) {
	var calldata []*felt.Felt

	// Convert verifier address
	verifierAddress, err := utils.HexToFelt(config.VerifierAddress)
	if err != nil {
		return nil, fmt.Errorf("invalid verifier address: %s", err)
	}
	calldata = append(calldata, verifierAddress)

	// Convert ETH address
	ethAddress, err := utils.HexToFelt(config.ETHAddress)
	if err != nil {
		return nil, fmt.Errorf("invalid ETH address: %s", err)
	}
	calldata = append(calldata, ethAddress)

	// Convert option round class hash
	optionRoundClassHash, err := utils.HexToFelt(config.OptionRoundClassHash)
	if err != nil {
		return nil, fmt.Errorf("invalid option round class hash: %s", err)
	}
	calldata = append(calldata, optionRoundClassHash)

	// Add alpha (uint256)
	alphaFelt := new(felt.Felt).SetUint64(config.Alpha)
	calldata = append(calldata, alphaFelt)

	// Add strike level (uint256)
	strikeLevelFelt := new(felt.Felt).SetUint64(config.StrikeLevel)
	calldata = append(calldata, strikeLevelFelt)

	// Add round transition duration (uint256)
	roundTransitionDurationFelt := new(felt.Felt).SetUint64(config.RoundTransitionDuration)
	calldata = append(calldata, roundTransitionDurationFelt)

	// Add auction duration (uint256)
	auctionDurationFelt := new(felt.Felt).SetUint64(config.AuctionDuration)
	calldata = append(calldata, auctionDurationFelt)

	// Add round duration (uint256)
	roundDurationFelt := new(felt.Felt).SetUint64(config.RoundDuration)
	calldata = append(calldata, roundDurationFelt)

	// Add program ID (felt252)
	programIDFelt, err := utils.HexToFelt(config.ProgramID)
	if err != nil {
		return nil, fmt.Errorf("invalid program ID: %s", err)
	}
	calldata = append(calldata, programIDFelt)

	// Add proving delay (uint256)
	provingDelayFelt := new(felt.Felt).SetUint64(config.ProvingDelay)
	calldata = append(calldata, provingDelayFelt)

	return calldata, nil
}

// VaultConfig contains the configuration for vault deployment
type VaultConfig struct {
	VerifierAddress         string `json:"verifier_address"`
	ETHAddress              string `json:"eth_address"`
	OptionRoundClassHash    string `json:"option_round_class_hash"`
	StrikeLevel             uint64 `json:"strike_level"`
	Alpha                   uint64 `json:"alpha"`
	RoundTransitionDuration uint64 `json:"round_transition_duration"`
	AuctionDuration         uint64 `json:"auction_duration"`
	RoundDuration           uint64 `json:"round_duration"`
	ProgramID               string `json:"program_id"`
	ProvingDelay            uint64 `json:"proving_delay"`
}

// DeploymentResult contains the result of a deployment
type DeploymentResult struct {
	ClassHash       string    `json:"class_hash"`
	DeployedAddress string    `json:"deployed_address"`
	TransactionHash string    `json:"transaction_hash"`
	DeploymentTime  time.Time `json:"deployment_time"`
}
