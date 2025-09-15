package db

import (
	"context"
	"event-processor/models"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"gorm.io/gorm"
)

type DB struct {
	Pool   *pgxpool.Pool
	Conn   *pgx.Conn
	tx     pgx.Tx
	ctx    context.Context
	logger *log.Logger
}

func (db *DB) BeginTx() {
	tx, err := db.Pool.Begin(db.ctx)
	if err != nil {
		log.Fatal(err)
	}
	db.tx = tx
}

func (db *DB) CommitTx() {
	db.tx.Commit(db.ctx)
	db.tx.Conn().Close(db.ctx)
	db.tx = nil
}

func (db *DB) RollbackTx() {
	db.tx.Rollback(db.ctx)
	db.tx.Conn().Close(db.ctx)
	db.tx = nil
}

func (db *DB) Init() error {

	db.logger = log.New(os.Stdout, "", log.LstdFlags)
	connStr := os.Getenv("DB_URL")
	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return fmt.Errorf("unable to parse connection string: %w", err)
	}

	conn, err := pgx.Connect(context.Background(), connStr)
	if err != nil {
		log.Fatal(err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return fmt.Errorf("unable to create connection pool: %w", err)
	}

	db.Conn = conn
	db.Pool = pool
	return nil
}

func (db *DB) MarkDriverEventAsProcessed(id int) error {
	query := `UPDATE driver_events SET is_processed = true WHERE id = $1;`
	_, err := db.tx.Exec(context.Background(), query, id)
	if err != nil {
		return fmt.Errorf("failed to mark driver event as processed: %w", err)
	}
	return nil
}
func (db *DB) GetUnprocessedDriverEvents() ([]models.DriverEvent, error) {
	query := `
			SELECT * FROM driver_events WHERE is_processed = false;`
	rows, err := db.tx.Query(context.Background(), query)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query unprocessed driver events: %w", err)
	}
	defer rows.Close()
	var events []models.DriverEvent
	for rows.Next() {
		var event models.DriverEvent
		if err := rows.Scan(&event); err != nil {
			return nil, fmt.Errorf("failed to scan driver event: %w", err)
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating driver event rows: %w", err)
	}
	return events, nil
}

func (db *DB) GetBlockByHash(blockHash string) (*models.StarknetBlock, error) {
	query := `SELECT * FROM starknet_blocks WHERE block_hash = $1;`
	var block models.StarknetBlock
	db.tx.QueryRow(context.Background(), query, blockHash).Scan(&block)
	return &block, nil
}

func (db *DB) GetEventsForVault(vaultAddress string, startBlockHash string, endBlockHash string) ([]models.Event, error) {

	startBlock, err := db.GetBlockByHash(startBlockHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get start block: %w", err)
	}
	endBlock, err := db.GetBlockByHash(endBlockHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get end block: %w", err)
	}
	query := `
		SELECT 
			from,
			event_nonce,
			block_hash,
			transaction_hash,
			block_number,
			vault_address,
			timestamp,
			event_name,
			event_keys,
			event_data
		FROM events
		WHERE vault_address = $1 AND block_number BETWEEN $2 AND $3;` //Including start and end block

	rows, err := db.tx.Query(context.Background(), query, vaultAddress, startBlock.BlockNumber, endBlock.BlockNumber)
	if err != nil {
		return nil, fmt.Errorf("failed to query events for vault: %w", err)
	}
	defer rows.Close()
	var events []models.Event
	for rows.Next() {
		var event models.Event
		if err := rows.Scan(
			&event.From,
			&event.EventNonce,
			&event.BlockHash,
			&event.TransactionHash,
			&event.BlockNumber,
			&event.VaultAddress,
			&event.Timestamp,
			&event.EventName,
			&event.EventKeys,
			&event.EventData,
		); err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event rows: %w", err)
	}
	return events, nil
}

func (db *DB) Shutdown() {
	db.Pool.Close()
	db.tx.Rollback(context.Background())
	db.tx.Conn().Close(context.Background())
	db.Conn.Close(context.Background())
}

func (db *DB) GetEventsByBlockHash(blockHash string, orderBy string) ([]models.Event, error) {


	query := `
		SELECT 
			from,
			event_nonce,
			block_hash,
			transaction_hash,
			block_number,
			vault_address,
			timestamp,
			event_name,
			event_keys,
			event_data
		FROM events
		WHERE block_hash = $1
		ORDER BY event_nonce $2 ASC;`

	rows, err := db.tx.Query(context.Background(), query, blockHash, orderBy)
	if err != nil {
		return nil, fmt.Errorf("failed to query events by block number: %w", err)
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var event models.Event
		if err := rows.Scan(
			&event.EventNonce,
			&event.BlockHash,
			&event.TransactionHash,
			&event.BlockNumber,
			&event.VaultAddress,
			&event.Timestamp,
			&event.EventName,
			&event.EventKeys,
			&event.EventData,
		); err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}
		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event rows: %w", err)
	}

	return events, nil
}

func (db *DB) CreateVault(vault *models.VaultState) error {
	query := `
		INSERT INTO vault_states (
			address,
			unlocked_balance,
			locked_balance,
			stashed_balance,
			latest_block
		) VALUES (
			$1, $2, $3, $4, $5
		)`

	if _, err := db.tx.Exec(
		context.Background(),
		query,
		vault.Address,
		vault.UnlockedBalance,
		vault.LockedBalance,
		vault.StashedBalance,
		vault.LatestBlock,
	); err != nil {
		return err
	}
	return nil
}

func (db *DB) UpdateVaultBalanceAuctionStart(vaultAddress string, blockNumber uint64) error {
	query := `
		UPDATE vault_states
		SET
			unlocked_balance = 0,
			locked_balance = unlocked_balance,
			latest_block = ?
		WHERE address = ?;`

	if _, err := db.tx.Exec(
		context.Background(),
		query,
		blockNumber,
		vaultAddress,
	); err != nil {
		return err
	}
	return nil

	// return db.tx.Model(models.VaultState{}).Where("address=?", vaultAddress).Updates(
	// 	map[string]interface{}{
	// 		"unlocked_balance": 0,
	// 		"locked_balance":   gorm.Expr("unlocked_balance"),
	// 		"latest_block":     blockNumber,
	// 	}).Error
}

func (db *DB) UpdateVaultBalancesAuctionEnd(
	vaultAddress string,
	unsoldLiquidity,
	premiums models.BigInt,
	blockNumber uint64) error {
	query := `
		UPDATE vault_states
		SET
			unlocked_balance = unlocked_balance + ?,
			locked_balance = locked_balance - ?,
			latest_block = ?
		WHERE address = ?;`

	if _, err := db.tx.Exec(
		context.Background(),
		query,
		unsoldLiquidity,
		premiums,
		blockNumber,
		vaultAddress,
	); err != nil {
		return err
	}
	return nil
	// return db.tx.Model(models.VaultState{}).Where("address=?", vaultAddress).Updates(
	// 	map[string]interface{}{
	// 		"unlocked_balance": gorm.Expr("unlocked_balance+?+?", unsoldLiquidity, premiums),
	// 		"locked_balance":   gorm.Expr("locked_balance-?", unsoldLiquidity),
	// 		"latest_block":     blockNumber,
	// 	}).Error

}

func (db *DB) UpdateAllLiquidityProvidersBalancesAuctionStart(vaultAddress string, blockNumber uint64) error {

	query := `UPDATE vault_states
	SET
		unlocked_balance = 0,
		locked_balance = unlocked_balance,
		latest_block = ?
	WHERE address = ?;	`

	if _, err := db.tx.Exec(
		context.Background(),
		query,
		blockNumber,
		vaultAddress,
	); err != nil {
		return err
	}
	return nil
	// return db.tx.Model(models.LiquidityProviderState{}).Where("vault_address=? AND unlocked_balance > 0", vaultAddress).Updates(
	// 	map[string]interface{}{
	// 		"locked_balance":   gorm.Expr("unlocked_balance"),
	// 		"unlocked_balance": 0,
	// 		"latest_block":     blockNumber,
	// 	}).Error
}

func (db *DB) UpdateAllLiquidityProvidersBalancesAuctionEnd(
	vaultAddress string,
	startingLiquidity,
	unsoldLiquidity,
	premiums models.BigInt,
	blockNumber uint64) error {

	zero := models.BigInt{
		Int: big.NewInt(0),
	}
	if startingLiquidity.Cmp(zero.Int) == 0 {
		return nil
	}
	query := `UPDATE liquidity_provider_states
	SET
		locked_balance = locked_balance - FLOOR((locked_balance*?)/?),
		unlocked_balance = unlocked_balance + FLOOR((locked_balance*?))/? + FLOOR((?*locked_balance)/?),
		latest_block = ?
	WHERE vault_address = ?;`

	if _, err := db.tx.Exec(
		context.Background(),
		query,
		unsoldLiquidity, startingLiquidity, unsoldLiquidity, startingLiquidity, premiums, startingLiquidity, blockNumber, vaultAddress,
	); err != nil {
		return err
	}
	return nil
	// return db.tx.Model(models.LiquidityProviderState{}).Where("vault_address=?", vaultAddress).Updates(
	// 	map[string]interface{}{
	// 		"locked_balance":   gorm.Expr("locked_balance-FLOOR((locked_balance*?)/?)", unsoldLiquidity, startingLiquidity),
	// 		"unlocked_balance": gorm.Expr("unlocked_balance+FLOOR((locked_balance*?))/?+FLOOR((?*locked_balance)/?)", unsoldLiquidity, startingLiquidity, premiums, startingLiquidity),
	// 		"latest_block":     blockNumber,
	// 	}).Error
}

func (db *DB) UpdateOptionRoundAuctionEnd(
	address string,
	clearingPrice,
	optionsSold, unsoldLiquidity, premiums models.BigInt) error {
	err := db.UpdateOptionRoundFields(
		address,
		map[string]interface{}{
			"clearing_price":   clearingPrice,
			"sold_options":     optionsSold,
			"state":            "Running",
			"unsold_liquidity": unsoldLiquidity,
			"premiums":         premiums,
		})
	if err != nil {
		return err
	}
	return nil
}

func (db *DB) UpdateBiddersAuctionEnd(
	roundAddress string,
	clearingPrice,
	clearingOptionsSold models.BigInt,
	clearingNonce uint64) error {
	bidsAbove, err := db.GetBidsAboveClearingForRound(roundAddress, clearingPrice, clearingNonce)
	if err != nil {
		return err
	}

	optionsLeft := models.BigInt{Int: new(big.Int).Sub(clearingOptionsSold.Int, big.NewInt(int64(clearingNonce)))}
	for _, bid := range bidsAbove {
		if clearingNonce == bid.TreeNonce {
			log.Printf("optionsLeft %v", optionsLeft)
			refundableAmount := models.BigInt{Int: new(big.Int).Mul(new(big.Int).Sub(bid.Amount.Int, optionsLeft.Int), clearingPrice.Int)}
			log.Printf("REFUNDABLEAMOUNT %v", refundableAmount)
			err := db.UpdateOptionBuyerFields(bid.BuyerAddress, roundAddress, map[string]interface{}{
				"refundable_amount": gorm.Expr("refundable_amount+?", refundableAmount),
				"mintable_options":  gorm.Expr("mintable_options+?", optionsLeft),
			})
			if err != nil {
				return err
			}

		} else {
			refundableAmount := models.BigInt{Int: new(big.Int).Mul(new(big.Int).Sub(bid.Price.Int, clearingPrice.Int), bid.Amount.Int)}
			log.Printf("REFUNDABLEAMOUNT %v", refundableAmount)
			err := db.UpdateOptionBuyerFields(bid.BuyerAddress, roundAddress, map[string]interface{}{
				"mintable_options":  gorm.Expr("mintable_options+?", bid.Amount),
				"refundable_amount": gorm.Expr("refundable_amount+?", refundableAmount),
			})
			if err != nil {
				return err
			}
			optionsLeft.Sub(optionsLeft.Int, bid.Amount.Int)
		}

	}
	bidsBelow, err := db.GetBidsBelowClearingForRound(roundAddress, clearingPrice, clearingNonce)
	if err != nil {
		return err
	}
	for _, bid := range bidsBelow {
		refundableAmount := models.BigInt{Int: new(big.Int).Mul(bid.Amount.Int, bid.Price.Int)}
		log.Printf("REFUNDABLEAMOUNT %v", refundableAmount)
		err := db.UpdateOptionBuyerFields(bid.BuyerAddress, roundAddress, map[string]interface{}{

			"refundable_amount": gorm.Expr("refundable_amount+?", refundableAmount),
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (db *DB) UpdateVaultBalancesOptionSettle(
	vaultAddress string,
	remainingLiquidityStashed,
	remainingLiquidityNotStashed models.BigInt,
	blockNumber uint64,
) error {
	query := `UPDATE vault_states SET
		stashed_balance = stashed_balance + ?,
		unlocked_balance = unlocked_balance + ?,
		locked_balance = 0,
		latest_block = ?
	WHERE address = ?;`

	if _, err := db.tx.Exec(
		context.Background(),
		query,
		remainingLiquidityStashed,
		remainingLiquidityNotStashed,
		blockNumber,
		vaultAddress,
	); err != nil {
		return err
	}
	return nil

	// return db.tx.Model(models.VaultState{}).Where("address=?", vaultAddress).Updates(map[string]interface{}{

	// 	"stashed_balance":  gorm.Expr("stashed_balance+ ? ", remainingLiquidityStashed),
	// 	"unlocked_balance": gorm.Expr("unlocked_balance+?", remainingLiquidityNotStashed),
	// 	"locked_balance":   0,
	// 	"latest_block":     blockNumber,
	// }).Error

}
func (db *DB) UpdateAllLiquidityProvidersBalancesOptionSettle(
	vaultAddress,
	roundAddress string,
	startingLiquidity,
	remainingLiquidty,
	remainingLiquidtyNotStashed,
	unsoldLiquidity,
	payoutPerOption,
	optionsSold models.BigInt,
	blockNumber uint64,
) error {

	query := `UPDATE liquidity_provider_states SET
	locked_balance = 0,
	unlocked_balance = unlocked_balance + FLOOR(
		CASE 
			WHEN $1::numeric - $2::numeric <> 0 
			THEN locked_balance * $3 / ($4::numeric - $5::numeric) 
			ELSE locked_balance
		END,
	latest_block = $6
	WHERE vault_address = $7 AND locked_balance > 0;`
	db.tx.Exec(
		context.Background(),
		query,
		remainingLiquidty,
		startingLiquidity,
		remainingLiquidty,
		startingLiquidity,
		unsoldLiquidity,
		blockNumber,
		vaultAddress,
	)

	// //	totalPayout := models.BigInt{Int: new(big.Int).Mul(optionsSold.Int, payoutPerOption.Int)}
	// db.tx.Model(models.LiquidityProviderState{}).Where("vault_address = ? AND locked_balance > 0", vaultAddress).Updates(map[string]interface{}{
	// 	"locked_balance": 0,
	// 	"unlocked_balance": gorm.Expr(`
	// 		unlocked_balance + FLOOR(
	// 			CASE
	// 				WHEN ?::numeric - ?::numeric <> 0
	// 				THEN locked_balance * ? / (?::numeric - ?::numeric)
	// 				ELSE locked_balance
	// 			END
	// 		)`, remainingLiquidty, startingLiquidity, remainingLiquidty, startingLiquidity, unsoldLiquidity),
	// 	"latest_block": blockNumber,
	// })
	queuedAmounts, err := db.GetAllQueuedLiquidityForRound(roundAddress)
	if err != nil {
		return err
	}
	for _, queuedAmount := range queuedAmounts {

		amountToAdd := &models.BigInt{Int: new(big.Int).Div(new(big.Int).Mul(remainingLiquidty.Int, queuedAmount.QueuedLiquidity.Int), (startingLiquidity.Int))}
		query := `UPDATE liquidity_providers SET
		stashed_balance = stashed_balance + $1,
		unlocked_balance = unlocked_balance - $2
		WHERE vault_address = $3 AND address = $4;`
		db.tx.Exec(
			context.Background(),
			query,
			amountToAdd,
			amountToAdd,
			vaultAddress,
			queuedAmount.Address,
		)

		// db.tx.Model(models.LiquidityProviderState{}).Where("vault_address=? AND address = ?", vaultAddress, queuedAmount.Address).
		// 	Updates(map[string]interface{}{
		// 		"stashed_balance":  gorm.Expr("stashed_balance + ?", amountToAdd),
		// 		"unlocked_balance": gorm.Expr("unlocked_balance - ?", amountToAdd),
		// 	})
	}

	/* Use this JOIN query to update this without creating 2 entries on the historic table
	// Perform the update in a single query using JOINs and subqueries
	err := db.Conn.Exec(`
		UPDATE liquidity_provider_states lps
		JOIN (
			SELECT
				address,
				queued_amount,
				remaining_liquidity * queued_amount / ? AS amount_to_add
			FROM queued_liquidity
			WHERE round_id = ?
		) ql ON lps.address = ql.address AND lps.round_id = ?
		SET
			lps.locked_balance = 0,
			lps.unlocked_balance = lps.unlocked_balance + lps.locked_balance - lps.locked_balance * ? / ? - ql.amount_to_add,
			lps.stashed_balance = lps.stashed_balance + ql.amount_to_add
	`, startingLiquidity, roundID, roundID, totalPayout, startingLiquidity).Error
	*/
	return nil
}
func (db *DB) GetVaultByAddress(address string) (*models.VaultState, error) {
	query := `SELECT * FROM vault_states WHERE address = $1; LIMIT 1`
	var vault models.VaultState

	db.tx.QueryRow(context.Background(), query, address).Scan(&vault)
	// if err := db.tx.Where("address = ?", address).First(&vault).Error; err != nil {
	// 	return nil, err
	// }
	return &vault, nil
}

func (db *DB) GetVaultAddresses() ([]string, error) {
	var addresses []string

	query := `SELECT address FROM vault_states; `
	rows, err := db.tx.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var address string
		err = rows.Scan(&address)
		if err != nil {
			return nil, err
		}
		addresses = append(addresses, address)
	}
	return addresses, nil
	// Use Pluck to retrieve only the "address" field from the VaultState model
	// err := db.Conn.Model(&models.VaultState{}).Pluck("address", &addresses).Error
	// if err != nil {
	// 	if err == gorm.ErrRecordNotFound {
	// 		return make([]string, 0), nil
	// 	} else {
	// 		return nil, err
	// 	}
	// }
	// return addresses, nil
}

func (db *DB) GetRoundAddresses(vaultAddress string) (*[]string, error) {
	var addresses []string

	query := `SELECT address FROM option_rounds WHERE vault_address = $1;`
	rows, err := db.tx.Query(context.Background(), query, vaultAddress)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var address string
		err = rows.Scan(&address)
		if err != nil {
			return nil, err
		}
		addresses = append(addresses, address)
	}
	return &addresses, nil
	// Use Pluck to retrieve only the "address" field from the VaultState model
	// err := db.Conn.Model(&models.VaultState{}).Pluck("address", &addresses).Error
	// if err != nil {
	// 	if err == gorm.ErrRecordNotFound {
	// 		return &[]string{}, nil
	// 	} else {
	// 		return nil, err
	// 	}
	// }
	// return &addresses, nil
}
func (db *DB) CreateOptionBuyer(buyer *models.OptionBuyer) error {
	query := `
		INSERT INTO option_buyers (
			address,
			round_address,
			mintable_options,
			refundable_amount,
			has_minted,
			has_refunded
		) VALUES (
			$1, $2, $3, $4, $5, $6
		) ON CONFLICT (address, round_address) 
		DO NOTHING;`

	_, err := db.tx.Exec(
		context.Background(),
		query,
		buyer.Address,
		buyer.RoundAddress,
		buyer.MintableOptions,
		buyer.RefundableOptions,
		buyer.HasMinted,
		buyer.HasRefunded,
	)
	if err != nil {
		return err
	}
	return nil
}

func (db *DB) UpsertQueuedLiquidity(queuedLiquidity *models.QueuedLiquidity) error {
	// Log the input for debugging
	// Log the input for debugging

	// Perform upsert using GORM's Clauses with the transaction object
	query := `
		INSERT INTO queued_liquidity (
			address,
			round_address,
			bps,
			queued_liquidity
		) VALUES (
			$1, $2, $3, $4
		) ON CONFLICT (address, round_address) 
		DO UPDATE SET
			bps = EXCLUDED.bps,
			queued_liquidity = EXCLUDED.queued_liquidity;`

	_, err := db.tx.Exec(
		context.Background(),
		query,
		queuedLiquidity.Address,
		queuedLiquidity.RoundAddress,
		queuedLiquidity.Bps,
		queuedLiquidity.QueuedLiquidity,
	)
	if err != nil {
		return err
	}
	return nil

	// err := db.tx.Clauses(clause.OnConflict{
	// 	Columns:   []clause.Column{{Name: "address"}, {Name: "round_address"}},
	// 	DoUpdates: clause.AssignmentColumns([]string{"bps", "queued_liquidity"}),
	// }).Create(queuedLiquidity).Error

	// if err != nil {
	// 	log.Printf("Upsert error: %v", err)
	// 	return err
	// }

	// return nil

}

func (db *DB) UpsertLiquidityProviderState(lp *models.LiquidityProviderState, blockNumber uint64) error {
	// Log the input for debugging
	// Log the input for debugging
	log.Printf("Upserting LP: %+v, Block Number: %d", lp, blockNumber)

	// Perform upsert using GORM's Clauses with the transaction object
	query := `
		INSERT INTO liquidity_provider_states (
			address,
			vault_address,
			unlocked_balance,
			latest_block
		) VALUES (
			$1, $2, $3, $4
		) ON CONFLICT (address, vault_address) 
		DO UPDATE SET unlocked_balance = EXCLUDED.unlocked_balance, latest_block = EXCLUDED.latest_block;`

	_, err := db.tx.Exec(
		context.Background(),
		query,
		lp.Address,
		lp.VaultAddress,
		lp.UnlockedBalance,
		blockNumber,
	)
	if err != nil {
		log.Printf("Upsert error: %v", err)
		return err
	}

	return nil
	// err := db.tx.Clauses(clause.OnConflict{
	// 	Columns:   []clause.Column{{Name: "address"}, {Name: "vault_address"}},
	// 	DoUpdates: clause.AssignmentColumns([]string{"unlocked_balance", "latest_block"}),
	// }).Create(lp).Error

	// if err != nil {
	// 	log.Printf("Upsert error: %v", err)
	// 	return err
	// }

	// return nil

}

func (db *DB) UpdateOptionBuyerFields(
	address string,
	roundAddress string,
	updates map[string]interface{},
) error {
	// Build the SET clause dynamically
	var setClause []string
	var values []interface{}
	valueIndex := 1

	for key, value := range updates {
		setClause = append(setClause, fmt.Sprintf("%s = $%d", key, valueIndex))
		values = append(values, value)
		valueIndex++
	}

	// Add the address and round_address as the last parameters
	values = append(values, address, roundAddress)

	// Construct the query
	query := fmt.Sprintf(`
		UPDATE option_buyers
		SET %s
		WHERE address = $%d AND round_address = $%d`,
		strings.Join(setClause, ", "),
		valueIndex,
		valueIndex+1,
	)

	// Execute the query
	if _, err := db.tx.Exec(context.Background(), query, values...); err != nil {
		return fmt.Errorf("failed to update option buyer fields: %w", err)
	}

	return nil

	// return db.tx.Model(models.OptionBuyer{}).Where("address = ? AND round_address = ?", address, roundAddress).Updates(updates).Error
}

func (db *DB) UpdateAllOptionBuyerFields(roundAddress string, updates map[string]interface{}) error {
	// Original GORM code:
	// return db.tx.Model(models.OptionRound{}).Where("round_address=?", roundAddress).Updates(updates).Error

	// Build the SET clause dynamically
	var setClause []string
	var values []interface{}
	valueIndex := 1

	for key, value := range updates {
		setClause = append(setClause, fmt.Sprintf("%s = $%d", key, valueIndex))
		values = append(values, value)
		valueIndex++
	}

	// Add the round_address as the last parameter
	values = append(values, roundAddress)

	// Construct the query
	query := fmt.Sprintf(`
		UPDATE option_rounds
		SET %s
		WHERE round_address = $%d`,
		strings.Join(setClause, ", "),
		valueIndex,
	)

	// Execute the query
	if _, err := db.tx.Exec(context.Background(), query, values...); err != nil {
		return fmt.Errorf("failed to update option round fields: %w", err)
	}

	return nil
}

func (db *DB) GetOptionRoundByAddress(address string) (*models.OptionRound, error) {
	// Original GORM code:
	// var or models.OptionRound
	// if err := db.tx.Where("address = ?", address).First(&or).Error; err != nil {
	// 	return nil, err
	// }
	// return &or, nil

	query := `
		SELECT 
			address,
			vault_address,
			round_id,
			cap_level,
			start_date,
			end_date,
			settlement_date,
			starting_liquidity,
			queued_liquidity,
			remaining_liquidity,
			available_options,
			clearing_price,
			settlement_price,
			reserve_price,
			strike_price,
			sold_options,
			unsold_liquidity,
			state,
			premiums,
			payout_per_option,
			deployment_date
		FROM option_rounds 
		WHERE address = $1
		LIMIT 1;`

	var or models.OptionRound
	err := db.tx.QueryRow(context.Background(), query, address).Scan(
		&or.Address,
		&or.VaultAddress,
		&or.RoundID,
		&or.CapLevel,
		&or.AuctionStartDate,
		&or.AuctionEndDate,
		&or.OptionSettleDate,
		&or.StartingLiquidity,
		&or.QueuedLiquidity,
		&or.RemainingLiquidity,
		&or.AvailableOptions,
		&or.ClearingPrice,
		&or.SettlementPrice,
		&or.ReservePrice,
		&or.StrikePrice,
		&or.OptionsSold,
		&or.UnsoldLiquidity,
		&or.RoundState,
		&or.Premiums,
		&or.PayoutPerOption,
		&or.DeploymentDate,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get option round: %w", err)
	}
	return &or, nil
}

func (db *DB) UpdateOptionRoundFields(address string, updates map[string]interface{}) error {
	// Build the SET clause dynamically
	var setClause []string
	var values []interface{}
	valueIndex := 1

	for key, value := range updates {
		setClause = append(setClause, fmt.Sprintf("%s = $%d", key, valueIndex))
		values = append(values, value)
		valueIndex++
	}

	// Add the address as the last parameter
	values = append(values, address)

	// Construct the query
	query := fmt.Sprintf(`
		UPDATE option_rounds
		SET %s
		WHERE address = $%d`,
		strings.Join(setClause, ", "),
		valueIndex,
	)

	// Execute the query
	if _, err := db.tx.Exec(context.Background(), query, values...); err != nil {
		return fmt.Errorf("failed to update option round fields: %w", err)
	}

	return nil
}

func (db *DB) UpdateVaultFields(address string, updates map[string]interface{}) error {
	// Original GORM code:
	// return db.tx.Model(models.VaultState{}).Where("address = ?", address).Updates(updates).Error

	// Build the SET clause dynamically
	var setClause []string
	var values []interface{}
	valueIndex := 1

	for key, value := range updates {
		setClause = append(setClause, fmt.Sprintf("%s = $%d", key, valueIndex))
		values = append(values, value)
		valueIndex++
	}

	// Add the address as the last parameter
	values = append(values, address)

	// Construct the query
	query := fmt.Sprintf(`
		UPDATE vault_states
		SET %s
		WHERE address = $%d`,
		strings.Join(setClause, ", "),
		valueIndex,
	)

	// Execute the query
	if _, err := db.tx.Exec(context.Background(), query, values...); err != nil {
		return fmt.Errorf("failed to update vault fields: %w", err)
	}

	return nil
}

func (db *DB) UpdateLiquidityProviderFields(vaultAddress, address string, updates map[string]interface{}) error {
	// Original GORM code:
	// return db.tx.Model(models.LiquidityProviderState{}).Where("vault_address = ? AND address = ?", vaultAddress, address).Updates(updates).Error

	// Build the SET clause dynamically
	var setClause []string
	var values []interface{}
	valueIndex := 1

	for key, value := range updates {
		setClause = append(setClause, fmt.Sprintf("%s = $%d", key, valueIndex))
		values = append(values, value)
		valueIndex++
	}

	// Add the vaultAddress and address as the last parameters
	values = append(values, vaultAddress, address)

	// Construct the query
	query := fmt.Sprintf(`
		UPDATE liquidity_provider_states
		SET %s
		WHERE vault_address = $%d AND address = $%d`,
		strings.Join(setClause, ", "),
		valueIndex,
		valueIndex+1,
	)

	// Execute the query
	if _, err := db.tx.Exec(context.Background(), query, values...); err != nil {
		return fmt.Errorf("failed to update liquidity provider fields: %w", err)
	}

	return nil
}

// DeleteOptionRound deletes an OptionRound record by its ID
func (db *DB) DeleteOptionRound(roundAddress string) error {
	// Original GORM code:
	// if err := db.tx.Where("address = ?", roundAddress).Delete(&models.OptionRound{}).Error; err != nil {
	//     return err
	// }
	// return nil

	query := `DELETE FROM option_rounds WHERE address = $1`

	if _, err := db.tx.Exec(context.Background(), query, roundAddress); err != nil {
		return fmt.Errorf("failed to delete option round: %w", err)
	}

	return nil
}

// CreateBid creates a new Bid record in the database
func (db *DB) CreateBid(bid *models.Bid) error {
	// Original GORM code:
	// if err := db.tx.Create(bid).Error; err != nil {
	// 	return err
	// }
	// return nil

	query := `
		INSERT INTO bids (
			buyer_address,
			round_address,
			bid_id,
			tree_nonce,
			amount,
			price
		) VALUES (
			$1, $2, $3, $4, $5, $6
		);`

	if _, err := db.tx.Exec(
		context.Background(),
		query,
		bid.BuyerAddress,
		bid.RoundAddress,
		bid.BidID,
		bid.TreeNonce,
		bid.Amount,
		bid.Price,
	); err != nil {
		return fmt.Errorf("failed to create bid: %w", err)
	}

	return nil
}

func (db *DB) CreateOptionRound(round *models.OptionRound) error {
	// Original GORM code:
	// if err := db.tx.Create(round).Error; err != nil {
	// 	return err
	// }
	// return nil

	query := `
		INSERT INTO option_rounds (
			address,
			vault_address,
			round_id,
			cap_level,
			start_date,
			end_date,
			settlement_date,
			starting_liquidity,
			queued_liquidity,
			remaining_liquidity,
			available_options,
			clearing_price,
			settlement_price,
			reserve_price,
			strike_price,
			sold_options,
			unsold_liquidity,
			state,
			premiums,
			payout_per_option,
			deployment_date
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
		);`

	if _, err := db.tx.Exec(
		context.Background(),
		query,
		round.Address,
		round.VaultAddress,
		round.RoundID,
		round.CapLevel,
		round.AuctionStartDate,
		round.AuctionEndDate,
		round.OptionSettleDate,
		round.StartingLiquidity,
		round.QueuedLiquidity,
		round.RemainingLiquidity,
		round.AvailableOptions,
		round.ClearingPrice,
		round.SettlementPrice,
		round.ReservePrice,
		round.StrikePrice,
		round.OptionsSold,
		round.UnsoldLiquidity,
		round.RoundState,
		round.Premiums,
		round.PayoutPerOption,
		round.DeploymentDate,
	); err != nil {
		return fmt.Errorf("failed to create option round: %w", err)
	}

	return nil
}

// DeleteBid deletes a Bid record by its ID
func (db *DB) DeleteBid(bidID string, roundAddress string) error {
	// Original GORM code:
	// if err := db.tx.Model(&models.Bid{}).Where("round_address=? AND bid_id=?", roundAddress, bidID).Error; err != nil {
	// 	return err
	// }
	// return nil

	query := `DELETE FROM bids WHERE round_address = $1 AND bid_id = $2`

	if _, err := db.tx.Exec(context.Background(), query, roundAddress, bidID); err != nil {
		return fmt.Errorf("failed to delete bid: %w", err)
	}

	return nil
}

func (db *DB) GetBidsForRound(roundAddress string) ([]models.Bid, error) {
	// Original GORM code:
	// var bids []models.Bid
	// if err := db.Conn.Where("round_address = ?", roundAddress).Order("price DESC,tree_nonce ASC").Find(&bids).Error; err != nil {
	// 	return nil, err
	// }
	// return bids, nil

	query := `
		SELECT 
			buyer_address,
			round_address,
			bid_id,
			tree_nonce,
			amount,
			price
		FROM bids
		WHERE round_address = $1
		ORDER BY price DESC, tree_nonce ASC;`

	rows, err := db.tx.Query(context.Background(), query, roundAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to get bids for round: %w", err)
	}
	defer rows.Close()

	var bids []models.Bid
	for rows.Next() {
		var bid models.Bid
		if err := rows.Scan(
			&bid.BuyerAddress,
			&bid.RoundAddress,
			&bid.BidID,
			&bid.TreeNonce,
			&bid.Amount,
			&bid.Price,
		); err != nil {
			return nil, fmt.Errorf("failed to scan bid: %w", err)
		}
		bids = append(bids, bid)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating bid rows: %w", err)
	}

	return bids, nil
}

func (db *DB) GetBidsAboveClearingForRound(
	roundAddress string,
	clearingPrice models.BigInt,
	clearingNonce uint64,
) ([]models.Bid, error) {
	// Original GORM code:
	// var bids []models.Bid
	// if err := db.Conn.
	// 	Where("round_address = ?", roundAddress).
	// 	Where("price > ? OR (price = ? AND tree_nonce <= ?)", clearingPrice, clearingPrice, clearingNonce).
	// 	Order("price DESC, tree_nonce ASC").
	// 	Find(&bids).Error; err != nil {
	// 	return nil, err
	// }
	// log.Printf("BIDS ABOVE %v", bids)
	// return bids, nil

	query := `
		SELECT 
			buyer_address,
			round_address,
			bid_id,
			tree_nonce,
			amount,
			price
		FROM bids
		WHERE round_address = $1
		AND (price > $2 OR (price = $3 AND tree_nonce <= $4))
		ORDER BY price DESC, tree_nonce ASC;`

	rows, err := db.tx.Query(
		context.Background(),
		query,
		roundAddress,
		clearingPrice,
		clearingPrice,
		clearingNonce,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get bids above clearing: %w", err)
	}
	defer rows.Close()

	var bids []models.Bid
	for rows.Next() {
		var bid models.Bid
		if err := rows.Scan(
			&bid.BuyerAddress,
			&bid.RoundAddress,
			&bid.BidID,
			&bid.TreeNonce,
			&bid.Amount,
			&bid.Price,
		); err != nil {
			return nil, fmt.Errorf("failed to scan bid: %w", err)
		}
		bids = append(bids, bid)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating bid rows: %w", err)
	}

	log.Printf("BIDS ABOVE %v", bids)
	return bids, nil
}

func (db *DB) GetBidsBelowClearingForRound(
	roundAddress string,
	clearingPrice models.BigInt,
	clearingNonce uint64,
) ([]models.Bid, error) {
	// Original GORM code:
	// var bids []models.Bid
	// if err := db.Conn.Where("round_address = ?", roundAddress).
	// 	Where("price < ? OR ( price = ? AND tree_nonce >?) ", clearingPrice, clearingPrice, clearingNonce).
	// 	Find(&bids).Error; err != nil {
	// 	return nil, err
	// }
	// log.Printf("BIDS ABOVE %v", bids)
	// return bids, nil

	query := `
		SELECT 
			buyer_address,
			round_address,
			bid_id,
			tree_nonce,
			amount,
			price
		FROM bids
		WHERE round_address = $1
		AND (price < $2 OR (price = $3 AND tree_nonce > $4));`

	rows, err := db.tx.Query(
		context.Background(),
		query,
		roundAddress,
		clearingPrice,
		clearingPrice,
		clearingNonce,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get bids below clearing: %w", err)
	}
	defer rows.Close()

	var bids []models.Bid
	for rows.Next() {
		var bid models.Bid
		if err := rows.Scan(
			&bid.BuyerAddress,
			&bid.RoundAddress,
			&bid.BidID,
			&bid.TreeNonce,
			&bid.Amount,
			&bid.Price,
		); err != nil {
			return nil, fmt.Errorf("failed to scan bid: %w", err)
		}
		bids = append(bids, bid)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating bid rows: %w", err)
	}

	log.Printf("BIDS BELOW %v", bids)
	return bids, nil
}

func (db *DB) GetAllQueuedLiquidityForRound(roundAddress string) ([]models.QueuedLiquidity, error) {

	var queuedAmounts []models.QueuedLiquidity
	query := `
		SELECT 
			address,
			round_address,
			bps,
			queued_liquidity
		FROM queued_liquidity
		WHERE round_address=?`
	rows, err := db.tx.Query(context.Background(), query, roundAddress)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var queuedAmount models.QueuedLiquidity
		if err := rows.Scan(&queuedAmount.Address, &queuedAmount.RoundAddress, &queuedAmount.Bps, &queuedAmount.QueuedLiquidity); err != nil {
			return nil, err
		}
		queuedAmounts = append(queuedAmounts, queuedAmount)
	}
	return queuedAmounts, nil
	// if err := db.Conn.Where("round_address=?", roundAddress).Find(&queuedAmounts).Error; err != nil {
	// 	return nil, err
	// }
	// return queuedAmounts, nil
}

// Revert Functions
func (db *DB) RevertVaultState(address string, blockNumber uint64) error {
	// Original GORM code:
	// var vaultState models.VaultState
	// var vaultHistoric, postRevert models.Vault
	// if err := db.tx.Where("address = ? AND last_block = ?", address, blockNumber).First(&vaultState).Error; err != nil {
	// 	if errors.Is(err, gorm.ErrRecordNotFound) {
	// 		return nil
	// 	} else {
	// 		return err
	// 	}
	// }
	//
	// if err := db.tx.Where("address = ? AND block_number = ?", address, blockNumber).First(&vaultHistoric).Error; err != nil {
	// 	return err
	// }
	//
	// if err := db.tx.Delete(&vaultHistoric).Error; err != nil {
	// 	return err
	// }
	//
	// if err := db.tx.Where("address = ?", address).
	// 	Order("latest_block DESC").
	// 	First(&postRevert).Error; err != nil {
	// 	return nil
	// }
	//
	// if err := db.tx.Where("address = ?").Updates(map[string]interface{}{
	// 	"unlocked_balance": postRevert.UnlockedBalance,
	// 	"locked_balance":   postRevert.LockedBalance,
	// 	"stashed_balance":  postRevert.StashedBalance,
	// 	"latest_block":     postRevert.BlockNumber,
	// }).Error; err != nil {
	// 	return err
	// }

	// Check if there is a vault state with the given last_block
	query := `
		SELECT 
			address 
		FROM vault_states 
		WHERE address = $1 AND last_block = $2 
		LIMIT 1;`

	var vaultAddress string
	err := db.tx.QueryRow(context.Background(), query, address, blockNumber).Scan(&vaultAddress)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil
		}
		return fmt.Errorf("failed to check vault state: %w", err)
	}

	// Delete the historic record
	deleteQuery := `
		DELETE FROM vaults 
		WHERE address = $1 AND block_number = $2;`

	if _, err := db.tx.Exec(context.Background(), deleteQuery, address, blockNumber); err != nil {
		return fmt.Errorf("failed to delete vault historic record: %w", err)
	}

	// Get the most recent vault record
	selectQuery := `
		SELECT 
			unlocked_balance,
			locked_balance,
			stashed_balance,
			block_number
		FROM vaults 
		WHERE address = $1 
		ORDER BY block_number DESC 
		LIMIT 1;`

	var unlockedBalance, lockedBalance, stashedBalance models.BigInt
	var latestBlock uint64

	err = db.tx.QueryRow(context.Background(), selectQuery, address).Scan(
		&unlockedBalance,
		&lockedBalance,
		&stashedBalance,
		&latestBlock,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil
		}
		return fmt.Errorf("failed to get latest vault: %w", err)
	}

	// Update the vault state
	updateQuery := `
		UPDATE vault_states 
		SET 
			unlocked_balance = $1,
			locked_balance = $2,
			stashed_balance = $3,
			latest_block = $4
		WHERE address = $5;`

	if _, err := db.tx.Exec(
		context.Background(),
		updateQuery,
		unlockedBalance,
		lockedBalance,
		stashedBalance,
		latestBlock,
		address,
	); err != nil {
		return fmt.Errorf("failed to update vault state: %w", err)
	}

	return nil
}

func (db *DB) RevertAllLPState(vaultAddress string, blockNumber uint64) error {
	// Original GORM code:
	// var lpStates []models.LiquidityProviderState
	// var lpHistoric, postRevert models.LiquidityProvider
	// if err := db.tx.Model(models.LiquidityProviderState{}).Where("vault_address = ? AND last_block = ?", vaultAddress, blockNumber).Find(&lpStates).Error; err != nil {
	// 	if errors.Is(err, gorm.ErrRecordNotFound) {
	// 		return nil
	// 	} else {
	// 		return err
	// 	}
	// }
	//
	// for _, lpState := range lpStates {
	// 	if err := db.tx.Model(models.LiquidityProvider{}).Where("vault_address = ? AND address = ? AND block_number = ?", vaultAddress, lpState.Address, blockNumber).First(&lpHistoric).Error; err != nil {
	// 		return err
	// 	}
	//
	// 	if err := db.tx.Delete(&lpHistoric).Error; err != nil {
	// 		return err
	// 	}
	//
	// 	if err := db.tx.Where("vault_address = ? AND address = ?", vaultAddress, lpState.Address).
	// 		Order("latest_block DESC").
	// 		First(&postRevert).Error; err != nil {
	// 		return nil
	// 	}
	//
	// 	if err := db.tx.Where("vault_address = ? AND address = ?").Updates(map[string]interface{}{
	// 		"unlocked_balance": postRevert.UnlockedBalance,
	// 		"locked_balance":   postRevert.LockedBalance,
	// 		"stashed_balance":  postRevert.StashedBalance,
	// 		"latest_block":     postRevert.BlockNumber,
	// 	}).Error; err != nil {
	// 		return err
	// 	}
	// }

	// Get all LP states for the vault address with the given last_block
	query := `
		SELECT 
			address 
		FROM liquidity_provider_states 
		WHERE vault_address = $1 AND last_block = $2;`

	rows, err := db.tx.Query(context.Background(), query, vaultAddress, blockNumber)
	if err != nil {
		return fmt.Errorf("failed to query LP states: %w", err)
	}
	defer rows.Close()

	var lpAddresses []string
	for rows.Next() {
		var address string
		if err := rows.Scan(&address); err != nil {
			return fmt.Errorf("failed to scan LP address: %w", err)
		}
		lpAddresses = append(lpAddresses, address)
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("error iterating LP rows: %w", err)
	}

	// For each LP state, revert it
	for _, address := range lpAddresses {
		// Delete the historic record
		deleteQuery := `
			DELETE FROM liquidity_providers 
			WHERE vault_address = $1 AND address = $2 AND block_number = $3;`

		if _, err := db.tx.Exec(context.Background(), deleteQuery, vaultAddress, address, blockNumber); err != nil {
			return fmt.Errorf("failed to delete LP historic record: %w", err)
		}

		// Get the most recent LP record
		selectQuery := `
			SELECT 
				unlocked_balance,
				locked_balance,
				stashed_balance,
				block_number
			FROM liquidity_providers 
			WHERE vault_address = $1 AND address = $2
			ORDER BY block_number DESC 
			LIMIT 1;`

		var unlockedBalance, lockedBalance, stashedBalance models.BigInt
		var latestBlock uint64

		err = db.tx.QueryRow(context.Background(), selectQuery, vaultAddress, address).Scan(
			&unlockedBalance,
			&lockedBalance,
			&stashedBalance,
			&latestBlock,
		)
		if err != nil {
			if err == pgx.ErrNoRows {
				continue // Skip if no record found
			}
			return fmt.Errorf("failed to get latest LP: %w", err)
		}

		// Update the LP state
		updateQuery := `
			UPDATE liquidity_provider_states 
			SET 
				unlocked_balance = $1,
				locked_balance = $2,
				stashed_balance = $3,
				latest_block = $4
			WHERE vault_address = $5 AND address = $6;`

		if _, err := db.tx.Exec(
			context.Background(),
			updateQuery,
			unlockedBalance,
			lockedBalance,
			stashedBalance,
			latestBlock,
			vaultAddress,
			address,
		); err != nil {
			return fmt.Errorf("failed to update LP state: %w", err)
		}
	}

	return nil
}

func (db *DB) RevertLPState(vaultAddress, address string, blockNumber uint64) error {
	// Original GORM code:
	// var lpState models.LiquidityProviderState
	// var lpHistoric, postRevert models.LiquidityProvider
	// if err := db.tx.Where("vault_address = ? AND address = ? AND last_block = ?", vaultAddress, address, blockNumber).First(&lpState).Error; err != nil {
	// 	if errors.Is(err, gorm.ErrRecordNotFound) {
	// 		return nil
	// 	} else {
	// 		return err
	// 	}
	// }
	//
	// if err := db.tx.Model(models.LiquidityProvider{}).Where("vault_address = ? AND address = ? AND block_number = ?", vaultAddress, address, blockNumber).First(&lpHistoric).Error; err != nil {
	// 	return err
	// }
	//
	// if err := db.tx.Delete(&lpHistoric).Error; err != nil {
	// 	return err
	// }
	//
	// if err := db.tx.Model(models.LiquidityProvider{}).Where("vault_address = ? AND address = ?", vaultAddress, address).
	// 	Order("latest_block DESC").
	// 	First(&postRevert).Error; err != nil {
	// 	return nil
	// }
	//
	// if err := db.tx.Model(models.LiquidityProviderState{}).Where("vault_address = ? AND address = ?", vaultAddress, address).Updates(map[string]interface{}{
	// 	"unlocked_balance": postRevert.UnlockedBalance,
	// 	"locked_balance":   postRevert.LockedBalance,
	// 	"stashed_balance":  postRevert.StashedBalance,
	// 	"latest_block":     postRevert.BlockNumber,
	// }).Error; err != nil {
	// 	return err
	// }

	// Check if there is an LP state with the given last_block
	query := `
		SELECT 
			address 
		FROM liquidity_provider_states 
		WHERE vault_address = $1 AND address = $2 AND last_block = $3 
		LIMIT 1;`

	var lpAddress string
	err := db.tx.QueryRow(context.Background(), query, vaultAddress, address, blockNumber).Scan(&lpAddress)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil
		}
		return fmt.Errorf("failed to check LP state: %w", err)
	}

	// Delete the historic record
	deleteQuery := `
		DELETE FROM liquidity_providers 
		WHERE vault_address = $1 AND address = $2 AND block_number = $3;`

	if _, err := db.tx.Exec(context.Background(), deleteQuery, vaultAddress, address, blockNumber); err != nil {
		return fmt.Errorf("failed to delete LP historic record: %w", err)
	}

	// Get the most recent LP record
	selectQuery := `
		SELECT 
			unlocked_balance,
			locked_balance,
			stashed_balance,
			block_number
		FROM liquidity_providers 
		WHERE vault_address = $1 AND address = $2
		ORDER BY block_number DESC 
		LIMIT 1;`

	var unlockedBalance, lockedBalance, stashedBalance models.BigInt
	var latestBlock uint64

	err = db.tx.QueryRow(context.Background(), selectQuery, vaultAddress, address).Scan(
		&unlockedBalance,
		&lockedBalance,
		&stashedBalance,
		&latestBlock,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil
		}
		return fmt.Errorf("failed to get latest LP: %w", err)
	}

	// Update the LP state
	updateQuery := `
		UPDATE liquidity_provider_states 
		SET 
			unlocked_balance = $1,
			locked_balance = $2,
			stashed_balance = $3,
			latest_block = $4
		WHERE vault_address = $5 AND address = $6;`

	if _, err := db.tx.Exec(
		context.Background(),
		updateQuery,
		unlockedBalance,
		lockedBalance,
		stashedBalance,
		latestBlock,
		vaultAddress,
		address,
	); err != nil {
		return fmt.Errorf("failed to update LP state: %w", err)
	}

	return nil
}

// GetAllOptionBuyers retrieves all OptionBuyer records from the database
