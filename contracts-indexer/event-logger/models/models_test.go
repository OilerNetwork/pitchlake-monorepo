package models

import (
	"math/big"
	"testing"

	"github.com/NethermindEth/juno/core"
	"github.com/NethermindEth/juno/core/felt"
	"github.com/NethermindEth/starknet.go/rpc"
)

func TestBigInt_Scan(t *testing.T) {
	tests := []struct {
		name        string
		input       interface{}
		expected    string
		expectError bool
	}{
		{
			name:        "scan from string",
			input:       "123456789",
			expected:    "123456789",
			expectError: false,
		},
		{
			name:        "scan from bytes",
			input:       []byte("987654321"),
			expected:    "987654321",
			expectError: false,
		},
		{
			name:        "scan from int64",
			input:       int64(555666777),
			expected:    "555666777",
			expectError: false,
		},
		{
			name:        "scan from invalid string",
			input:       "not_a_number",
			expected:    "",
			expectError: true,
		},
		{
			name:        "scan from unsupported type",
			input:       float64(123.45),
			expected:    "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			bigInt := &BigInt{}

			// Act
			err := bigInt.Scan(tt.input)

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

			if bigInt.String() != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, bigInt.String())
			}
		})
	}
}

func TestBigInt_Value(t *testing.T) {
	tests := []struct {
		name     string
		input    *BigInt
		expected string
	}{
		{
			name:     "nil BigInt",
			input:    &BigInt{},
			expected: "0",
		},
		{
			name:     "valid BigInt",
			input:    &BigInt{Int: big.NewInt(123456789)},
			expected: "123456789",
		},
		{
			name:     "zero BigInt",
			input:    &BigInt{Int: big.NewInt(0)},
			expected: "0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			value, err := tt.input.Value()

			// Assert
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if value != tt.expected {
				t.Errorf("Expected %s, got %v", tt.expected, value)
			}
		})
	}
}

func TestNewBigInt(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "valid decimal string",
			input:    "123456789",
			expected: "123456789",
		},
		{
			name:     "zero string",
			input:    "0",
			expected: "0",
		},
		{
			name:     "large number",
			input:    "999999999999999999999",
			expected: "999999999999999999999",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			result := NewBigInt(tt.input)

			// Assert
			if result.String() != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result.String())
			}
		})
	}
}

func TestCoreToStarknetBlock(t *testing.T) {
	// Arrange
	hash := new(felt.Felt)
	hash.SetString("0x1234567890abcdef")

	parentHash := new(felt.Felt)
	parentHash.SetString("0xabcdef1234567890")

	block := core.Block{
		Header: &core.Header{
			Number:     12345,
			Hash:       hash,
			ParentHash: parentHash,
			Timestamp:  1640995200, // 2022-01-01 00:00:00 UTC
		},
	}

	// Act
	result := CoreToStarknetBlock(block)

	// Assert
	if result.BlockNumber != block.Number {
		t.Errorf("Expected block number %d, got %d", block.Number, result.BlockNumber)
	}
	if result.BlockHash != block.Hash.String() {
		t.Errorf("Expected block hash %s, got %s", block.Hash.String(), result.BlockHash)
	}
	if result.ParentHash != block.ParentHash.String() {
		t.Errorf("Expected parent hash %s, got %s", block.ParentHash.String(), result.ParentHash)
	}
	if result.Timestamp != block.Timestamp {
		t.Errorf("Expected timestamp %d, got %d", block.Timestamp, result.Timestamp)
	}
	if result.Status != "MINED" {
		t.Errorf("Expected status 'MINED', got %s", result.Status)
	}
}

func TestRPCBlockToStarknetBlock(t *testing.T) {
	// Arrange
	hash := new(felt.Felt)
	hash.SetString("0xfedcba0987654321")

	parentHash := new(felt.Felt)
	parentHash.SetString("0x1234567890abcdef")

	rpcBlock := &rpc.BlockTxHashes{
		BlockHeader: rpc.BlockHeader{
			Number:     67890,
			Hash:       hash,
			ParentHash: parentHash,
			Timestamp:  1641081600, // 2022-01-02 00:00:00 UTC
		},
	}

	// Act
	result := RPCBlockToStarknetBlock(rpcBlock)

	// Assert
	if result.BlockNumber != rpcBlock.BlockHeader.Number {
		t.Errorf("Expected block number %d, got %d", rpcBlock.BlockHeader.Number, result.BlockNumber)
	}
	if result.BlockHash != rpcBlock.BlockHeader.Hash.String() {
		t.Errorf("Expected block hash %s, got %s", rpcBlock.BlockHeader.Hash.String(), result.BlockHash)
	}
	if result.ParentHash != rpcBlock.BlockHeader.ParentHash.String() {
		t.Errorf("Expected parent hash %s, got %s", rpcBlock.BlockHeader.ParentHash.String(), result.ParentHash)
	}
	if result.Timestamp != rpcBlock.BlockHeader.Timestamp {
		t.Errorf("Expected timestamp %d, got %d", rpcBlock.BlockHeader.Timestamp, result.Timestamp)
	}
	if result.Status != "MINED" {
		t.Errorf("Expected status 'MINED', got %s", result.Status)
	}
}
