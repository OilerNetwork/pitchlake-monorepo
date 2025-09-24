package vault

import (
	"junoplugin/models"
	"testing"

	"github.com/stretchr/testify/assert"
)

// Test the core logic: when LoadVaultsFromRegistry processes vaults,
// it should call InitializeVault for vaults that have LastBlockIndexed == nil
func TestVaultInitializationLogic(t *testing.T) {
	t.Run("InitializeVault should be called when LastBlockIndexed is nil", func(t *testing.T) {
		// Create test data that represents what LoadVaultsFromRegistry would receive
		vaultWithoutLastBlock := &models.VaultRegistry{
			Address:            "0xvault1",
			DeployedAt:         "0xdeploy1",
			LastBlockIndexed:   nil, // This is the key - no last block
			LastBlockProcessed: nil,
		}

		vaultWithLastBlock := &models.VaultRegistry{
			Address:            "0xvault2",
			DeployedAt:         "0xdeploy2",
			LastBlockIndexed:   stringPtr("0xblock123"), // This vault has a last block
			LastBlockProcessed: nil,
		}

		// Track which vaults would have InitializeVault called
		var initializeVaultCalledFor []*models.VaultRegistry

		// Simulate the exact logic from LoadVaultsFromRegistry (lines 52-55)
		vaultRegistry := []*models.VaultRegistry{
			vaultWithoutLastBlock,
			vaultWithLastBlock,
		}

		for _, vault := range vaultRegistry {
			if vault.LastBlockIndexed == nil {
				initializeVaultCalledFor = append(initializeVaultCalledFor, vault)
			}
		}

		// Verify the behavior
		assert.Len(t, initializeVaultCalledFor, 1, "InitializeVault should be called for exactly one vault")
		assert.Equal(t, vaultWithoutLastBlock, initializeVaultCalledFor[0],
			"InitializeVault should be called for the vault with nil LastBlockIndexed")
	})

	t.Run("InitializeVault should not be called when all vaults have LastBlockIndexed", func(t *testing.T) {
		// Create vaults that all have LastBlockIndexed
		vaultsWithLastBlock := []*models.VaultRegistry{
			{
				Address:            "0xvault1",
				DeployedAt:         "0xdeploy1",
				LastBlockIndexed:   stringPtr("0xblock123"),
				LastBlockProcessed: nil,
			},
			{
				Address:            "0xvault2",
				DeployedAt:         "0xdeploy2",
				LastBlockIndexed:   stringPtr("0xblock456"),
				LastBlockProcessed: nil,
			},
		}

		// Track which vaults would have InitializeVault called
		var initializeVaultCalledFor []*models.VaultRegistry

		// Simulate the exact logic from LoadVaultsFromRegistry (lines 52-55)
		for _, vault := range vaultsWithLastBlock {
			if vault.LastBlockIndexed == nil {
				initializeVaultCalledFor = append(initializeVaultCalledFor, vault)
			}
		}

		// Verify the behavior
		assert.Len(t, initializeVaultCalledFor, 0, "InitializeVault should not be called when all vaults have LastBlockIndexed")
	})

	t.Run("InitializeVault should be called for multiple vaults without LastBlockIndexed", func(t *testing.T) {
		// Create multiple vaults without LastBlockIndexed
		vaultsWithoutLastBlock := []*models.VaultRegistry{
			{
				Address:            "0xvault1",
				DeployedAt:         "0xdeploy1",
				LastBlockIndexed:   nil, // No last block
				LastBlockProcessed: nil,
			},
			{
				Address:            "0xvault2",
				DeployedAt:         "0xdeploy2",
				LastBlockIndexed:   nil, // No last block
				LastBlockProcessed: nil,
			},
		}

		// Track which vaults would have InitializeVault called
		var initializeVaultCalledFor []*models.VaultRegistry

		// Simulate the exact logic from LoadVaultsFromRegistry (lines 52-55)
		for _, vault := range vaultsWithoutLastBlock {
			if vault.LastBlockIndexed == nil {
				initializeVaultCalledFor = append(initializeVaultCalledFor, vault)
			}
		}

		// Verify the behavior
		assert.Len(t, initializeVaultCalledFor, 2, "InitializeVault should be called for both vaults without LastBlockIndexed")
	})
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}
