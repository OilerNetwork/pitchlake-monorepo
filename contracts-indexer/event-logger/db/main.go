package db

import (
	"context"
	"fmt"
	"junoplugin/models"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
	tx   pgx.Tx
	ctx  context.Context
	url  string
}

type DBInterface interface {
	BeginTx()
	CommitTx()
	RollbackTx()
	GetVaultRegistry() ([]*models.VaultRegistry, error)
	InsertBlock(block *models.StarknetBlocks) error
	GetLastBlock() (*models.StarknetBlocks, error)
	GetBlock(hash string) (*models.StarknetBlocks, error)
	GetNextBlock(hash string) (*models.StarknetBlocks, error)
	GetVaultRegistryByAddress(address string) (models.VaultRegistry, error)
	GetLastIndexedBlockVault(address string) (uint64, error)
	StoreEvent(txHash, vaultAddress string, blockNumber uint64, blockHash string, eventName string, eventKeys []string, eventData []string) error
	InsertVault(vault *models.VaultRegistry) error
	UpdateVaultRegistry(address string, blockHash string) error
	StoreDriverEvent(eventType string, blockHash string) error
	StoreVaultCatchupEvent(vaultAddress string, startBlockHash, endBlockHash string) error
	Shutdown()
}

func Init(dbUrl string) (*DB, error) {
	config, err := pgxpool.ParseConfig(dbUrl)
	if err != nil {
		return nil, fmt.Errorf("unable to parse connection string: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// m, err := migrate.New(
	// 	"file://db/migrations",
	// 	dbUrl)
	// if err != nil {
	// 	log.Printf("FAIlED HERE 1")
	// 	return nil, err
	// }
	// if err := m.Up(); err != nil {
	// 	if err != migrate.ErrNoChange {
	// 		return nil, err
	// 	}

	// }
	// m.Close()

	return &DB{
		Pool: pool,
		ctx:  context.Background(),
		url:  dbUrl, //Unsafe possibly, need to consolidate config better
	}, nil

}

func (db *DB) Shutdown() {
	db.Pool.Close()
}

func (db *DB) BeginTx() {
	tx, err := db.Pool.Begin(context.TODO())
	if err != nil {
		log.Printf("WTHELLY TX WAALA")
		log.Fatal(err)
	}
	db.tx = tx
}

func (db *DB) CommitTx() {
	db.tx.Commit(db.ctx)
	db.tx = nil
}

func (db *DB) RollbackTx() {
	db.tx.Rollback(db.ctx)
	db.tx = nil
}
