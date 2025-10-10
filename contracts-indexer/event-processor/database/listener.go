package database

import (
	"context"
	"encoding/json"
	"event-processor/adaptors"
	"event-processor/models"
	"fmt"
	"log"
)

func (db *DB) Listener() error {
	_, err := db.Conn.Exec(db.ctx, "LISTEN driver_events")
	if err != nil {
		return fmt.Errorf("failed to start listening for driver events: %w", err)
	}

	fmt.Println("Waiting for notifications...")

	for {
		// Wait for a notification
		notification, err := db.Conn.WaitForNotification(context.Background())
		if err != nil {
			return fmt.Errorf("failed to wait for notification: %w", err)
		}

		var driverEventData models.DriverEvent
		err = json.Unmarshal([]byte(notification.Payload), &driverEventData)
		if err != nil {
			log.Printf("Error parsing driver_events payload: %v", err)
			return fmt.Errorf("failed to parse driver_events payload: %w", err)
		}
		fmt.Println("Received an update on driver_events")
		err = db.processDriverEvent(driverEventData)
		if err != nil {
			log.Printf("Error processing driver_events: %v", err)
			return fmt.Errorf("failed to process driver_events: %w", err)
		}
		//Process notification here
	}
}

func (db *DB) revertVaultEvent(
	event models.Event,
) error {

	junoEvent := adaptors.GetJunoEvent(event)
	var err error
	switch event.EventName {
	case "ContractDeployed":
	case "Deposit", "Withdraw":

		lpAddress, _, _ := adaptors.DepositOrWithdraw(junoEvent)
		err = db.DepositOrWithdrawOrStashWithdrawRevert(event.VaultAddress, lpAddress, event.BlockNumber)
	case "StashWithdrawn":
		lpAddress, _, _ := adaptors.StashWithdrawn(junoEvent)
		err = db.DepositOrWithdrawOrStashWithdrawRevert(event.VaultAddress, lpAddress, event.BlockNumber)
	case "WithdrawalQueued":
		lpAddress,
			bps,
			roundId,
			accountQueuedBefore,
			accountQueuedNow,
			vaultQueuedNow := adaptors.WithdrawalQueued(junoEvent)

		err = db.WithdrawalQueuedRevertIndex(
			lpAddress,
			event.VaultAddress,
			roundId,
			bps,
			accountQueuedBefore,
			accountQueuedNow,
			vaultQueuedNow,
			event.BlockNumber,
		)
	case "OptionRoundDeployed":
		roundAddress := adaptors.FeltToHexString(junoEvent.Data[2].Bytes())
		err = db.DeleteOptionRound(roundAddress)

	}
	if err != nil {
		return err
	}

	return nil
}
func (db *DB) processVaultEvent(
	event models.Event,
) error {

	var err error
	junoEvent := adaptors.GetJunoEvent(event)
	log.Printf("event.EventName %v", event.EventName)
	switch event.EventName {
	case "Deposit":
		lpAddress,
			lpUnlocked,
			vaultUnlocked := adaptors.DepositOrWithdraw(junoEvent)

		err = db.DepositIndex(event.VaultAddress, lpAddress, lpUnlocked, vaultUnlocked, event.BlockNumber)
	case "Withdrawal":
		lpAddress,
			lpUnlocked,
			vaultUnlocked := adaptors.DepositOrWithdraw(junoEvent)

		err = db.WithdrawIndex(event.VaultAddress, lpAddress, lpUnlocked, vaultUnlocked, event.BlockNumber)
	case "WithdrawalQueued":
		lpAddress,
			bps,
			roundId,
			accountQueuedBefore,
			accountQueuedNow,
			vaultQueuedNow := adaptors.WithdrawalQueued(junoEvent)

		err = db.WithdrawalQueuedIndex(
			lpAddress,
			event.VaultAddress,
			roundId,
			bps,
			accountQueuedBefore,
			accountQueuedNow,
			vaultQueuedNow,
		)

	case "StashWithdrawn":
		lpAddress, amount, vaultStashed := adaptors.StashWithdrawn(junoEvent)
		err = db.StashWithdrawnIndex(
			event.VaultAddress,
			lpAddress,
			amount,
			vaultStashed,
			event.BlockNumber,
		)
	case "OptionRoundDeployed":

		optionRound := adaptors.RoundDeployed(junoEvent)
		log.Printf("Processing OptionRoundDeployed event, block hash %v", event.BlockHash)
		block, err := db.GetBlockByHash(event.BlockHash)
		if err != nil {
			return err
		}
		optionRound.DeploymentDate = block.Timestamp
		err = db.RoundDeployedIndex(optionRound)
		if err != nil {
			return err
		}

	case "OptionRoundEmitted":
		log.Printf("Processing OptionRoundEmitted event")
		err = db.processOptionRoundEvent(event)
	}
	if err != nil {
		return err
	}
	return nil
}

func (db *DB) processOptionRoundEvent(
	event models.Event,
) error {

	junoEvent := adaptors.GetJunoEvent(event)
	optionRoundEventName := adaptors.OptionRoundEmittedEventName(junoEvent)
	roundId := junoEvent.Data[0].Uint64()
	log.Printf("Round ID %v", roundId)
	log.Printf("Processing OptionRoundEmitted event %v", optionRoundEventName)
	prevStateOptionRound, err := db.GetRoundById(roundId, event.VaultAddress)
	if err != nil {
		log.Printf("Error getting round by id %v", err)
		return err
	}

	switch optionRoundEventName {
	case "PricingDataSet":
		strikePrice, capLevel, reservePrice := adaptors.PricingDataSet(junoEvent)
		err = db.PricingDataSetIndex(prevStateOptionRound.Address, strikePrice, capLevel, reservePrice)
	case "AuctionStarted":
		availableOptions, startingLiquidity := adaptors.AuctionStarted(junoEvent)
		err = db.AuctionStartedIndex(event.VaultAddress, prevStateOptionRound.Address, event.BlockNumber, availableOptions, startingLiquidity)
	case "AuctionEnded":
		optionsSold, clearingPrice, unsoldLiquidity, clearingNonce, premiums := adaptors.AuctionEnded(junoEvent)
		err = db.AuctionEndedIndex(
			*prevStateOptionRound,
			prevStateOptionRound.Address,
			event.BlockNumber,
			clearingNonce,
			optionsSold,
			clearingPrice,
			premiums,
			unsoldLiquidity,
		)
	case "OptionRoundSettled":
		settlementPrice, payoutPerOption := adaptors.OptionRoundSettled(junoEvent)
		err = db.RoundSettledIndex(
			*prevStateOptionRound,
			prevStateOptionRound.Address,
			event.BlockNumber,
			settlementPrice,
			prevStateOptionRound.OptionsSold,
			payoutPerOption,
		)
	case "BidPlaced":
		bid, buyer := adaptors.BidPlaced(junoEvent)
		err = db.BidPlacedIndex(bid, buyer)
	case "BidUpdated":
		bidId, price, _, treeNonceNew := adaptors.BidUpdated(junoEvent)
		err = db.BidUpdatedIndex(prevStateOptionRound.Address, bidId, price, treeNonceNew)
	case "OptionsMinted":
		buyerAddress, _ := adaptors.OptionsMinted(junoEvent)
		err = db.UpdateOptionBuyerFields(
			buyerAddress,
			prevStateOptionRound.Address,
			map[string]interface{}{
				"has_minted": true,
			})
	case "OptionsExercised":
		buyerAddress, _, _, _ := adaptors.OptionsExercised(junoEvent)
		err = db.UpdateOptionBuyerFields(
			buyerAddress,
			prevStateOptionRound.Address,
			map[string]interface{}{
				"has_minted": true,
			})
	case "UnusedBidsRefunded":
		buyerAddress, _ := adaptors.UnusedBidsRefunded(junoEvent)
		err = db.UpdateOptionBuyerFields(
			buyerAddress,
			prevStateOptionRound.Address,
			map[string]interface{}{
				"has_refunded": true,
			})
	}
	if err != nil {
		return err
	}
	return nil
}
