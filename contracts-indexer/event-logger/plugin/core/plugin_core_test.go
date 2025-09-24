package core

import (
	"junoplugin/models"
	"testing"

	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockVaultManager is a simple mock that implements VaultManagerInterface
type mockVaultManager struct {
	loadVaultsCalled bool
	loadVaultsError  error
	lastBlock        *models.StarknetBlocks
}

func (m *mockVaultManager) LoadVaultsFromRegistry(block *models.StarknetBlocks) error {
	m.loadVaultsCalled = true
	m.lastBlock = block
	return m.loadVaultsError
}

func (m *mockVaultManager) InitializeVault(vault *models.VaultRegistry) error {
	return nil
}

func (m *mockVaultManager) IsVaultAddress(address string) bool {
	return false
}

func (m *mockVaultManager) ProcessVaultEvent(vaultAddress string, event *rpc.EmittedEvent) error {
	return nil
}

func TestCheckAndSync(t *testing.T) {
	testBlock := &models.StarknetBlocks{
		BlockNumber: 12345,
		BlockHash:   "0x1234567890abcdef",
		ParentHash:  "0xabcdef1234567890",
		Timestamp:   1640995200,
		Status:      "MINED",
	}

	t.Run("returns early when already synced", func(t *testing.T) {
		mockVM := &mockVaultManager{}
		pc := &PluginCore{
			synced:       true,
			vaultManager: mockVM,
		}

		err := pc.CheckAndSync(testBlock)
		require.NoError(t, err)
		assert.True(t, pc.synced)
		assert.False(t, mockVM.loadVaultsCalled, "LoadVaultsFromRegistry should not be called when already synced")
	})

	t.Run("calls LoadVaultsFromRegistry when not synced", func(t *testing.T) {
		mockVM := &mockVaultManager{}
		pc := &PluginCore{
			synced:       false,
			vaultManager: mockVM,
		}

		err := pc.CheckAndSync(testBlock)
		require.NoError(t, err)
		assert.True(t, pc.synced, "synced should be set to true after successful sync")
		assert.True(t, mockVM.loadVaultsCalled, "LoadVaultsFromRegistry should be called when not synced")
		assert.Equal(t, testBlock, mockVM.lastBlock, "LoadVaultsFromRegistry should be called with the correct block")
	})

	t.Run("does not set synced to true when LoadVaultsFromRegistry fails", func(t *testing.T) {
		mockVM := &mockVaultManager{
			loadVaultsError: assert.AnError,
		}
		pc := &PluginCore{
			synced:       false,
			vaultManager: mockVM,
		}

		err := pc.CheckAndSync(testBlock)
		assert.Error(t, err)
		assert.False(t, pc.synced, "synced should remain false when LoadVaultsFromRegistry fails")
		assert.True(t, mockVM.loadVaultsCalled, "LoadVaultsFromRegistry should still be called even if it fails")
	})
}
