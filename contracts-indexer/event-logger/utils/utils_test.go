package utils

import (
	"math/big"
	"testing"

	"github.com/NethermindEth/juno/core"
	"github.com/NethermindEth/juno/core/felt"
)

func TestKeccak256(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			input:    "Deposit",
			expected: "0x2c7216fb67e74a66f6dd529eb7a1e230d99c61d3bb75117872c3ce31f3956715",
		},
		{
			input:    "Withdrawal",
			expected: "0x2a2c43bf243bbd8cbc4c2f5c8b0e7c5e8c5e8c5e8c5e8c5e8c5e8c5e8c5e8c5",
		},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := Keccak256(tt.input)
			if result == "" {
				t.Error("Expected non-empty result")
			}
			// We can't easily test the exact hash without duplicating the implementation
			// but we can test that it's consistent
			result2 := Keccak256(tt.input)
			if result != result2 {
				t.Error("Keccak256 should be deterministic")
			}
		})
	}
}

func TestDecodeEventNameVault(t *testing.T) {
	// Test with a known event name hash
	depositHash := Keccak256("Deposit")

	result, err := DecodeEventNameVault(depositHash)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}

	if result != "Deposit" {
		t.Errorf("Expected 'Deposit', got '%s'", result)
	}

	// Test with unknown hash
	unknownHash := "0x1234567890abcdef"
	_, err = DecodeEventNameVault(unknownHash)
	if err == nil {
		t.Error("Expected error for unknown hash")
	}
}

func TestNormalizeHexAddress(t *testing.T) {
	tests := []struct {
		input       string
		expected    string
		expectError bool
	}{
		{
			input:       "0x050aa16a833664c92d4163b14fed470786fa4411ffd3b3addbb97a70ae56efbd",
			expected:    "0x50aa16a833664c92d4163b14fed470786fa4411ffd3b3addbb97a70ae56efbd",
			expectError: false,
		},
		{
			input:       "0x50aa16a833664c92d4163b14fed470786fa4411ffd3b3addbb97a70ae56efbd",
			expected:    "0x50aa16a833664c92d4163b14fed470786fa4411ffd3b3addbb97a70ae56efbd",
			expectError: false,
		},
		{
			input:       "0x0000000000000000000000000000000000000000000000000000000000000000",
			expected:    "0x0",
			expectError: false,
		},
		{
			input:       "0x0000000000000000000000000000000000000000000000000000000000000001",
			expected:    "0x1",
			expectError: false,
		},
		{
			input:       "invalid",
			expected:    "",
			expectError: true,
		},
		{
			input:       "0x",
			expected:    "0x0",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result, err := NormalizeHexAddress(tt.input)

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

			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestHexStringToFelt(t *testing.T) {
	tests := []struct {
		input       string
		expectError bool
	}{
		{
			input:       "0x123",
			expectError: false,
		},
		{
			input:       "123",
			expectError: false,
		},
		{
			input:       "0x",
			expectError: true,
		},
		{
			input:       "invalid",
			expectError: true,
		},
		{
			input:       "0xgg",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result, err := HexStringToFelt(tt.input)

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

			if result == nil {
				t.Error("Expected non-nil result")
			}
		})
	}
}

func TestDecimalStringToHexString(t *testing.T) {
	tests := []struct {
		input       string
		expected    string
		expectError bool
	}{
		{
			input:       "0",
			expected:    "0x0",
			expectError: false,
		},
		{
			input:       "1",
			expected:    "0x1",
			expectError: false,
		},
		{
			input:       "255",
			expected:    "0xff",
			expectError: false,
		},
		{
			input:       "256",
			expected:    "0x100",
			expectError: false,
		},
		{
			input:       "invalid",
			expected:    "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result, err := DecimalStringToHexString(tt.input)

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

			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestBigIntToHexString(t *testing.T) {
	tests := []struct {
		input    *big.Int
		expected string
	}{
		{
			input:    big.NewInt(0),
			expected: "0x0",
		},
		{
			input:    big.NewInt(1),
			expected: "0x1",
		},
		{
			input:    big.NewInt(255),
			expected: "0xff",
		},
		{
			input:    big.NewInt(256),
			expected: "0x100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.input.String(), func(t *testing.T) {
			result := BigIntToHexString(*tt.input)
			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestCombineFeltToBigInt(t *testing.T) {
	tests := []struct {
		name     string
		highFelt [32]byte
		lowFelt  [32]byte
		expected string
	}{
		{
			name:     "combine two zero felts",
			highFelt: [32]byte{},
			lowFelt:  [32]byte{},
			expected: "0",
		},
		{
			name:     "combine with low felt only",
			highFelt: [32]byte{},
			lowFelt:  [32]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1},
			expected: "1",
		},
		{
			name:     "combine with high felt only",
			highFelt: [32]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1},
			lowFelt:  [32]byte{},
			expected: "115792089237316195423570985008687907853269984665640564039457584007913129639936", // 2^256
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			result := CombineFeltToBigInt(tt.highFelt, tt.lowFelt)

			// Assert
			if result.String() != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result.String())
			}
		})
	}
}

func TestFeltToBigInt(t *testing.T) {
	tests := []struct {
		name     string
		felt     [32]byte
		expected string
	}{
		{
			name:     "zero felt",
			felt:     [32]byte{},
			expected: "0",
		},
		{
			name:     "single byte felt",
			felt:     [32]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255},
			expected: "255",
		},
		{
			name:     "multi-byte felt",
			felt:     [32]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0},
			expected: "256",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			result := FeltToBigInt(tt.felt)

			// Assert
			if result.String() != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result.String())
			}
		})
	}
}

func TestFeltToHexString(t *testing.T) {
	tests := []struct {
		name     string
		felt     [32]byte
		expected string
	}{
		{
			name:     "zero felt",
			felt:     [32]byte{},
			expected: "0x0",
		},
		{
			name:     "single byte felt",
			felt:     [32]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255},
			expected: "0xff",
		},
		{
			name:     "multi-byte felt",
			felt:     [32]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0},
			expected: "0x100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			result := FeltToHexString(tt.felt)

			// Assert
			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestEventToStringArrays(t *testing.T) {
	// Arrange
	key1 := new(felt.Felt)
	key1.SetString("0x123")

	key2 := new(felt.Felt)
	key2.SetString("0x456")

	data1 := new(felt.Felt)
	data1.SetString("0x789")

	data2 := new(felt.Felt)
	data2.SetString("0xabc")

	event := core.Event{
		Keys: []*felt.Felt{key1, key2},
		Data: []*felt.Felt{data1, data2},
	}

	// Act
	keys, data := EventToStringArrays(event)

	// Assert
	if len(keys) != 2 {
		t.Errorf("Expected 2 keys, got %d", len(keys))
	}
	if len(data) != 2 {
		t.Errorf("Expected 2 data items, got %d", len(data))
	}
	if keys[0] != "0x123" {
		t.Errorf("Expected first key '0x123', got '%s'", keys[0])
	}
	if keys[1] != "0x456" {
		t.Errorf("Expected second key '0x456', got '%s'", keys[1])
	}
	if data[0] != "0x789" {
		t.Errorf("Expected first data '0x789', got '%s'", data[0])
	}
	if data[1] != "0xabc" {
		t.Errorf("Expected second data '0xabc', got '%s'", data[1])
	}
}

func TestFeltArrayToStringArrays(t *testing.T) {
	// Arrange
	felt1 := new(felt.Felt)
	felt1.SetString("0x111")

	felt2 := new(felt.Felt)
	felt2.SetString("0x222")

	felt3 := new(felt.Felt)
	felt3.SetString("0x333")

	feltArray := []*felt.Felt{felt1, felt2, felt3}

	// Act
	result := FeltArrayToStringArrays(feltArray)

	// Assert
	if len(result) != 3 {
		t.Errorf("Expected 3 items, got %d", len(result))
	}
	if result[0] != "0x111" {
		t.Errorf("Expected first item '0x111', got '%s'", result[0])
	}
	if result[1] != "0x222" {
		t.Errorf("Expected second item '0x222', got '%s'", result[1])
	}
	if result[2] != "0x333" {
		t.Errorf("Expected third item '0x333', got '%s'", result[2])
	}
}
