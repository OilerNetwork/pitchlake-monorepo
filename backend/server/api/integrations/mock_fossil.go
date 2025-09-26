package integrations

import (
	"context"
	"fmt"
	"math/big"
	"os"
	"strconv"
	"time"

	"pitchlake-backend/models"

	"github.com/NethermindEth/juno/core/felt"
	"github.com/NethermindEth/starknet.go/account"
	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/NethermindEth/starknet.go/utils"
)

type MockFossilService struct {
	account *account.Account
	client  *rpc.Provider
}

// NewMockFossilService creates a new mock fossil service
func NewMockFossilService() (*MockFossilService, error) {
	rpcURL := os.Getenv("STARKNET_RPC_URL")
	accountAddress := os.Getenv("STARKNET_ACCOUNT_ADDRESS")
	privateKey := os.Getenv("STARKNET_PRIVATE_KEY")
	publicKey := os.Getenv("STARKNET_PUBLIC_KEY")

	if rpcURL == "" || accountAddress == "" || privateKey == "" || publicKey == "" {
		return nil, fmt.Errorf("missing required Starknet environment variables")
	}

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
	// Note: Make sure this is a regular account, not an Argent account
	accnt, err := account.NewAccount(client, accountAddressInFelt, publicKey, ks, account.CairoV2)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize account: %s", err)
	}

	return &MockFossilService{
		account: accnt,
		client:  client,
	}, nil
}

// SendMockFossilRequest sends a mock fossil request by calling the vault contract directly
func (m *MockFossilService) SendMockFossilRequest(request models.FossilRequest) (*struct {
	JobID  string `json:"job_id"`
	Status string `json:"status"`
}, error) {
	// Convert vault address to felt
	vaultAddress, err := utils.HexToFelt(request.VaultAddress)
	if err != nil {
		return nil, fmt.Errorf("invalid vault address: %s", err)
	}

	provingDelayStr := "30"

	provingDelay, err := strconv.ParseUint(provingDelayStr, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid proving delay: %s", err)
	}

	// Calculate timestamp: upper bound + proving delay + tolerance
	// For now, using a tolerance of 60 seconds (can be made configurable later)
	tolerance := uint64(60) // seconds
	timestamp := request.Params.ReservePrice[1] + provingDelay + tolerance

	// Hardcoded values as specified in the support-server implementation
	RESERVE_PRICE := "34028236692093846346337460743176821145600000000"
	TWAP := "680564733841876926926749214863536422912000000000"
	MAX_RETURN := "113416112894748789872342756657008344878"

	// Serialize job request: [vault_address, timestamp, program_id]
	programIDFelt, err := utils.HexToFelt(request.ProgramID)
	if err != nil {
		return nil, fmt.Errorf("invalid program ID: %s", err)
	}

	timestampFelt := new(felt.Felt).SetUint64(timestamp)
	jobRequestSerialized := []*felt.Felt{
		vaultAddress,  // vault address
		timestampFelt, // timestamp
		programIDFelt, // program id
	}

	// Serialize result: [reserve_price_lower, reserve_price_upper, reserve_price, twap_lower, twap_upper, twap, max_return_lower, max_return_upper, max_return]
	reservePriceLowerFelt := new(felt.Felt).SetUint64(request.Params.ReservePrice[0])
	reservePriceUpperFelt := new(felt.Felt).SetUint64(request.Params.ReservePrice[1])
	reservePriceFelt, err := utils.HexToFelt(RESERVE_PRICE)
	if err != nil {
		return nil, fmt.Errorf("invalid reserve price: %s", err)
	}

	twapLowerFelt := new(felt.Felt).SetUint64(request.Params.Twap[0])
	twapUpperFelt := new(felt.Felt).SetUint64(request.Params.Twap[1])
	twapFelt, err := utils.HexToFelt(TWAP)
	if err != nil {
		return nil, fmt.Errorf("invalid twap: %s", err)
	}

	maxReturnLowerFelt := new(felt.Felt).SetUint64(request.Params.MaxReturn[0])
	maxReturnUpperFelt := new(felt.Felt).SetUint64(request.Params.MaxReturn[1])
	maxReturnFelt, err := utils.HexToFelt(MAX_RETURN)
	if err != nil {
		return nil, fmt.Errorf("invalid max return: %s", err)
	}

	resultSerialized := []*felt.Felt{
		reservePriceLowerFelt, // reserve price lower bound
		reservePriceUpperFelt, // reserve price upper bound
		reservePriceFelt,      // reserve price
		twapLowerFelt,         // twap lower bound
		twapUpperFelt,         // twap upper bound
		twapFelt,              // twap
		maxReturnLowerFelt,    // max return lower bound
		maxReturnUpperFelt,    // max return upper bound
		maxReturnFelt,         // max return
	}

	fmt.Printf("Calling fossil_callback directly on vault contract\n")
	fmt.Printf("Vault Address: %s\n", request.VaultAddress)
	fmt.Printf("Job Request: %v\n", jobRequestSerialized)
	fmt.Printf("Result: %v\n", resultSerialized)

	// Call fossil_callback directly on the vault contract
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// The fossil_callback function expects two separate arrays as parameters
	// In Cairo, arrays are serialized as [length, element1, element2, ...]
	// So for two arrays [1,2,3] and [4,5,6], calldata should be [3, 1, 2, 3, 3, 4, 5, 6]
	calldata := []*felt.Felt{
		new(felt.Felt).SetUint64(uint64(len(jobRequestSerialized))), // Length of first array
	}
	calldata = append(calldata, jobRequestSerialized...)                                 // First array elements
	calldata = append(calldata, new(felt.Felt).SetUint64(uint64(len(resultSerialized)))) // Length of second array
	calldata = append(calldata, resultSerialized...)                                     // Second array elements

	response, err := m.account.BuildAndSendInvokeTxn(ctx, []rpc.InvokeFunctionCall{
		{
			ContractAddress: vaultAddress,
			FunctionName:    "fossil_callback",
			CallData:        calldata,
		},
	}, nil)

	if err != nil {
		return nil, fmt.Errorf("failed to execute fossil_callback: %s", err)
	}

	fmt.Printf("Mock verifier callback sent successfully\n")
	fmt.Printf("Transaction Hash: %s\n", response.Hash)

	// Return a mock response similar to Fossil API
	mockResponse := &struct {
		JobID  string `json:"job_id"`
		Status string `json:"status"`
	}{
		JobID:  fmt.Sprintf("mock_job_%d", time.Now().Unix()),
		Status: "completed", // Since we're calling directly, it's immediately completed
	}

	fmt.Printf("Mock verifier request completed. Response: %+v\n", mockResponse)
	return mockResponse, nil
}
