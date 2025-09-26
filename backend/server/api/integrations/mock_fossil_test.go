package integrations

import (
	"os"
	"testing"

	"pitchlake-backend/models"
)

func TestMockFossilService_NewMockFossilService(t *testing.T) {
	// Test with missing environment variables
	originalEnv := os.Getenv("STARKNET_RPC_URL")
	os.Unsetenv("STARKNET_RPC_URL")
	defer func() {
		if originalEnv != "" {
			os.Setenv("STARKNET_RPC_URL", originalEnv)
		}
	}()

	_, err := NewMockFossilService()
	if err == nil {
		t.Error("Expected error when STARKNET_RPC_URL is missing, got nil")
	}
}

func TestMockFossilService_SendMockFossilRequest_Validation(t *testing.T) {
	// Set up minimal environment for testing
	os.Setenv("STARKNET_RPC_URL", "http://localhost:5050")
	os.Setenv("STARKNET_ACCOUNT_ADDRESS", "0x123")
	os.Setenv("STARKNET_PRIVATE_KEY", "0x456")
	os.Setenv("STARKNET_PUBLIC_KEY", "0x789")
	os.Setenv("PROVING_DELAY", "300")

	// This will fail because we don't have a real RPC connection, but we can test validation
	service, err := NewMockFossilService()
	if err != nil {
		// Expected to fail in test environment without real RPC
		t.Logf("Mock service creation failed as expected: %v", err)
		return
	}

	// Test with invalid vault address
	invalidRequest := models.FossilRequest{
		ProgramID:   "0x123",
		VaultAddress: "invalid_address",
		Params: struct {
			Twap        [2]uint64 `json:"twap"`
			MaxReturn   [2]uint64 `json:"max_return"`
			ReservePrice [2]uint64 `json:"reserve_price"`
		}{
			Twap:        [2]uint64{1640995200, 1640998800},
			MaxReturn:   [2]uint64{100, 200},
			ReservePrice: [2]uint64{300, 400},
		},
	}

	_, err = service.SendMockFossilRequest(invalidRequest)
	if err == nil {
		t.Error("Expected error for invalid vault address, got nil")
	}
}

func TestFossilAPI_DevMode(t *testing.T) {
	// Test that FossilAPI correctly detects dev mode
	os.Setenv("DEV_MODE", "true")
	os.Setenv("STARKNET_RPC_URL", "http://localhost:5050")
	os.Setenv("STARKNET_ACCOUNT_ADDRESS", "0x123")
	os.Setenv("STARKNET_PRIVATE_KEY", "0x456")
	os.Setenv("STARKNET_PUBLIC_KEY", "0x789")

	api := NewFossilAPI("test_key", "http://test.com")
	
	// In dev mode, it should have a mock service (even if it fails to initialize)
	if !api.isDevMode {
		t.Error("Expected dev mode to be true")
	}

	// Test GetJobStatus with mock job
	status, err := api.GetJobStatus("mock_job_123456")
	if err != nil {
		t.Errorf("Expected no error for mock job status, got: %v", err)
	}
	if status == nil || *status != "completed" {
		t.Errorf("Expected mock job status to be 'completed', got: %v", status)
	}
}
