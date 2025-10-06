package core

import (
	"fmt"
	"junoplugin/db"
	"junoplugin/models"
	"junoplugin/network"
	"junoplugin/plugin/block"
	"junoplugin/plugin/config"
	"junoplugin/plugin/vault"
	"log"

	"github.com/NethermindEth/juno/core"
	"github.com/NethermindEth/juno/core/felt"
	junoplugin "github.com/NethermindEth/juno/plugin"
)

// PluginCore orchestrates all plugin components
type PluginFactory struct {
	config         *config.Config
	db             *db.DB
	network        *network.Network
	vaultManager   *vault.Manager
	blockProcessor *block.Processor
	log            *log.Logger
	initialized    bool
}

// NewPluginCore creates a new plugin core
func NewPluginCore() (*PluginFactory, error) {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %w", err)
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	// Initialize database
	dbClient, err := db.Init(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	lastBlockDB, err := dbClient.GetLastBlock()
	if err != nil {
		return nil, fmt.Errorf("failed to get last block: %w", err)
	}
	blockProcessor := block.NewProcessor(
		dbClient,
		nil,
		nil,
		lastBlockDB,
	)

	return &PluginFactory{
		config:         cfg,
		db:             dbClient,
		network:        nil,
		vaultManager:   nil,
		blockProcessor: blockProcessor,
		log:            log.Default(),
		initialized:    false,
	}, nil
}

// Shutdown shuts down the plugin
func (pc *PluginFactory) Shutdown() error {
	pc.log.Println("Shutting down plugin core")
	pc.db.Shutdown()
	return nil
}

func (pc *PluginFactory) SyncPlugin(starknetBlock *models.StarknetBlocks) error {
	// Initialize network
	if pc.network == nil {
		networkClient, err := network.NewNetwork()
		if err != nil {
			return fmt.Errorf("failed to initialize network: %w", err)
		}
		pc.network = networkClient
		pc.blockProcessor.SetNetwork(networkClient)
	}

	if pc.vaultManager == nil {
		vaultManager := vault.NewManager(pc.db, pc.network, pc.config.UDCAddress)
		pc.vaultManager = vaultManager
		pc.blockProcessor.SetVaultManager(vaultManager)
	}
	// Initialize vault manager

	log.Printf("Syncing vaults")

	if err := pc.vaultManager.LoadVaultsFromRegistry(starknetBlock); err != nil {
		pc.log.Printf("failed to initialize vaults: skipping sync%v", err)
		return nil
	}

	pc.log.Println("Plugin core initialized successfully")
	//Only set this to true if no failures
	pc.initialized = true
	return nil
}

func (pc *PluginFactory) CheckAndSync(starknetBlock *models.StarknetBlocks) error {

	if pc.initialized {
		if err := pc.vaultManager.SyncUnsyncedVaults(starknetBlock); err != nil {
			return err
		}
		return nil
	}
	err := pc.SyncPlugin(starknetBlock)
	if err != nil {
		pc.log.Printf("failed to sync plugin: %v", err)
		return err
	}
	return nil
	// Get last block from database
}

// NewBlock processes a new block
func (pc *PluginFactory) NewBlock(
	block *core.Block,
	stateUpdate *core.StateUpdate,
	newClasses map[felt.Felt]core.Class,
) error {
	starknetBlock := models.CoreToStarknetBlock(*block)
	if err := pc.CheckAndSync(&starknetBlock); err != nil {
		pc.log.Printf("failed to check and sync: %v", err)
		return err
	}
	return pc.blockProcessor.ProcessNewBlock(block, stateUpdate, newClasses)
}

// RevertBlock reverts a block
func (pc *PluginFactory) RevertBlock(
	from,
	to *junoplugin.BlockAndStateUpdate,
	reverseStateDiff *core.StateDiff,
) error {

	starknetBlock := models.CoreToStarknetBlock(*from.Block)
	if err := pc.CheckAndSync(&starknetBlock); err != nil {
		pc.log.Printf("failed to check and sync: %v", err)
		return err
	}
	return pc.blockProcessor.RevertBlock(from, to, reverseStateDiff)
}

// GetVaultManager returns the vault manager
func (pc *PluginFactory) GetVaultManager() *vault.Manager {
	return pc.vaultManager
}

// GetDB returns the database instance
func (pc *PluginFactory) GetDB() *db.DB {
	return pc.db
}
