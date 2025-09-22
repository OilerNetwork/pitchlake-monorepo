package config

import (
	"os"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	tests := []struct {
		name        string
		envVars     map[string]string
		expectError bool
		expected    *Config
	}{
		{
			name: "valid configuration with all required fields",
			envVars: map[string]string{
				"DB_URL":      "postgres://user:pass@localhost:5432/db",
				"RPC_URL":     "https://starknet-mainnet.infura.io",
				"UDC_ADDRESS": "0x123",
				"CURSOR":      "1000",
			},
			expectError: false,
			expected: &Config{
				DatabaseURL: "postgres://user:pass@localhost:5432/db",
				RPCURL:      "https://starknet-mainnet.infura.io",
				UDCAddress:  "0x123",
				Cursor:      1000,
			},
		},
		{
			name: "valid configuration with minimal required fields",
			envVars: map[string]string{
				"DB_URL":  "postgres://user:pass@localhost:5432/db",
				"RPC_URL": "https://starknet-mainnet.infura.io",
			},
			expectError: false,
			expected: &Config{
				DatabaseURL: "postgres://user:pass@localhost:5432/db",
				RPCURL:      "https://starknet-mainnet.infura.io",
				UDCAddress:  "",
				Cursor:      0,
			},
		},
		{
			name: "missing DB_URL",
			envVars: map[string]string{
				"RPC_URL": "https://starknet-mainnet.infura.io",
			},
			expectError: true,
		},
		{
			name: "missing RPC_URL",
			envVars: map[string]string{
				"DB_URL": "postgres://user:pass@localhost:5432/db",
			},
			expectError: true,
		},
		{
			name: "invalid CURSOR value",
			envVars: map[string]string{
				"DB_URL":  "postgres://user:pass@localhost:5432/db",
				"RPC_URL": "https://starknet-mainnet.infura.io",
				"CURSOR":  "not_a_number",
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange - save original env vars
			originalEnv := make(map[string]string)
			for key := range tt.envVars {
				originalEnv[key] = os.Getenv(key)
			}

			// Clean up after test
			t.Cleanup(func() {
				// Restore original env vars
				for key, value := range originalEnv {
					if value == "" {
						os.Unsetenv(key)
					} else {
						os.Setenv(key, value)
					}
				}
			})

			// Set test env vars
			for key, value := range tt.envVars {
				os.Setenv(key, value)
			}

			// Act
			result, err := LoadConfig()

			// Assert
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if result.DatabaseURL != tt.expected.DatabaseURL {
				t.Errorf("Expected DatabaseURL %s, got %s", tt.expected.DatabaseURL, result.DatabaseURL)
			}
			if result.RPCURL != tt.expected.RPCURL {
				t.Errorf("Expected RPCURL %s, got %s", tt.expected.RPCURL, result.RPCURL)
			}
			if result.UDCAddress != tt.expected.UDCAddress {
				t.Errorf("Expected UDCAddress %s, got %s", tt.expected.UDCAddress, result.UDCAddress)
			}
			if result.Cursor != tt.expected.Cursor {
				t.Errorf("Expected Cursor %d, got %d", tt.expected.Cursor, result.Cursor)
			}
		})
	}
}

func TestConfig_Validate(t *testing.T) {
	tests := []struct {
		name        string
		config      *Config
		expectError bool
	}{
		{
			name: "valid config",
			config: &Config{
				DatabaseURL: "postgres://user:pass@localhost:5432/db",
				RPCURL:      "https://starknet-mainnet.infura.io",
				UDCAddress:  "0x123",
				Cursor:      1000,
			},
			expectError: false,
		},
		{
			name: "missing database URL",
			config: &Config{
				DatabaseURL: "",
				RPCURL:      "https://starknet-mainnet.infura.io",
			},
			expectError: true,
		},
		{
			name: "missing RPC URL",
			config: &Config{
				DatabaseURL: "postgres://user:pass@localhost:5432/db",
				RPCURL:      "",
			},
			expectError: true,
		},
		{
			name: "both URLs missing",
			config: &Config{
				DatabaseURL: "",
				RPCURL:      "",
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			err := tt.config.Validate()

			// Assert
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}
