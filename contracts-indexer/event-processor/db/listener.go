package db

import (
	"context"
	"encoding/json"
	"event-processor/adaptors"
	"event-processor/models"
	"fmt"
	"log"
	"math/big"
)

func (db *DB) Listener() {
	_, err := db.Conn.Exec(db.ctx, "LISTEN driver_events")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Waiting for notifications...")

	for {
		// Wait for a notification
		notification, err := db.Conn.WaitForNotification(context.Background())
		if err != nil {
			log.Fatal(err)
		}

		var driverEventData models.DriverEvent
		err = json.Unmarshal([]byte(notification.Payload), &driverEventData)
		if err != nil {
			log.Printf("Error parsing driver_events payload: %v", err)
			return
		}
		fmt.Println("Received an update on driver_events")
		err = db.processDriverEvent(driverEventData)
		if err != nil {
			log.Printf("Error processing driver_events: %v", err)
			return
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

	case "AuctionStarted":
		_, _, roundAddress := adaptors.AuctionStarted(junoEvent)
		prevStateOptionRound, err := db.GetOptionRoundByAddress(roundAddress)
		if err != nil {
			return err
		}
		err = db.AuctionStartedRevert(prevStateOptionRound.VaultAddress, roundAddress, event.BlockNumber)
		if err != nil {
			return err
		}
	case "AuctionEnded":
		_, _, _, _, _, roundAddress := adaptors.AuctionEnded(junoEvent)
		prevStateOptionRound, err := db.GetOptionRoundByAddress(roundAddress)
		if err != nil {
			return err
		}
		err = db.AuctionEndedRevert(prevStateOptionRound.VaultAddress, roundAddress, event.BlockNumber)
		if err != nil {
			return err
		}
	case "OptionRoundSettled":
		_, _, roundAddress := adaptors.OptionRoundSettled(junoEvent)
		prevStateOptionRound, err := db.GetOptionRoundByAddress(roundAddress)
		if err != nil {
			return err
		}
		err = db.RoundSettledRevert(prevStateOptionRound.VaultAddress, roundAddress, event.BlockNumber)
		if err != nil {
			return err
		}
	case "BidPlaced":
		bid, _ := adaptors.BidPlaced(junoEvent)
		err = db.BidPlacedRevert(bid.BidID, bid.RoundAddress)
	case "BidUpdated":
		bidId, amount, treeNonceOld, _, roundAddress := adaptors.BidUpdated(junoEvent)
		err = db.BidUpdatedRevert(bidId, roundAddress, amount, treeNonceOld)
	case "OptionsMinted":
		buyerAddress, _, roundAddress := adaptors.OptionsMinted(junoEvent)
		err = db.UpdateOptionBuyerFields(
			buyerAddress,
			roundAddress,
			map[string]interface{}{
				"has_minted": false,
			})
	case "OptionsExercised":
		buyerAddress, _, mintableOptionsExercised, _, roundAddress := adaptors.OptionsExercised(junoEvent)

		zero := models.BigInt{
			Int: big.NewInt(0),
		}
		if mintableOptionsExercised.Cmp(zero.Int) == 1 {
			err = db.UpdateOptionBuyerFields(
				buyerAddress,
				roundAddress,
				map[string]interface{}{
					"has_minted": false,
				})
		}
	case "UnusedBidsRefunded":
		buyerAddress, _, roundAddress := adaptors.UnusedBidsRefunded(junoEvent)
		err = db.UpdateOptionBuyerFields(
			buyerAddress,
			roundAddress,
			map[string]interface{}{
				"has_refunded": false,
			})

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
	switch event.EventName {
	case "Deposit": //Add withdrawQueue and collect queue case based on event
		lpAddress,
			lpUnlocked,
			vaultUnlocked := adaptors.DepositOrWithdraw(junoEvent)

		err = db.DepositIndex(event.VaultAddress, lpAddress, lpUnlocked, vaultUnlocked, event.BlockNumber)
		//Map the other parameters as well
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
		optionRound.DeploymentDate = event.Timestamp
		err = db.RoundDeployedIndex(optionRound)
	case "PricingDataSet":
		strikePrice, capLevel, reservePrice, roundAddress := adaptors.PricingDataSet(junoEvent)
		err = db.PricingDataSetIndex(roundAddress, strikePrice, capLevel, reservePrice)
	case "AuctionStarted":
		availableOptions, startingLiquidity, roundAddress := adaptors.AuctionStarted(junoEvent)
		err = db.AuctionStartedIndex(
			event.VaultAddress,
			roundAddress,
			event.BlockNumber,
			availableOptions,
			startingLiquidity,
		)
	case "AuctionEnded":
		optionsSold,
			clearingPrice,
			unsoldLiquidity,
			clearingNonce,
			premiums,
			roundAddress := adaptors.AuctionEnded(junoEvent)

		prevStateOptionRound, err := db.GetOptionRoundByAddress(roundAddress)
		if err != nil {
			return err
		}
		if err := db.AuctionEndedIndex(
			*prevStateOptionRound,
			roundAddress,
			event.BlockNumber,
			clearingNonce,
			optionsSold,
			clearingPrice,
			premiums,
			unsoldLiquidity,
		); err != nil {
			return err
		}
	case "OptionRoundSettled":
		settlementPrice, payoutPerOption, roundAddress := adaptors.OptionRoundSettled(junoEvent)
		prevStateOptionRound, err := db.GetOptionRoundByAddress(roundAddress)
		if err != nil {
			return err
		}
		if err := db.RoundSettledIndex(
			*prevStateOptionRound,
			roundAddress,
			event.BlockNumber,
			settlementPrice,
			prevStateOptionRound.OptionsSold,
			payoutPerOption,
		); err != nil {
			return err
		}
	case "BidPlaced":
		bid, buyer := adaptors.BidPlaced(junoEvent)
		err = db.BidPlacedIndex(bid, buyer)
	case "BidUpdated":
		bidId, price, _, treeNonceNew, roundAddress := adaptors.BidUpdated(junoEvent)
		err = db.BidUpdatedIndex(roundAddress, bidId, price, treeNonceNew)
	case "OptionsMinted":
		buyerAddress, _, roundAddress := adaptors.OptionsMinted(junoEvent)

		err = db.UpdateOptionBuyerFields(
			buyerAddress,
			roundAddress,
			map[string]interface{}{
				"has_minted": true,
			})
	case "OptionsExercised":
		buyerAddress, _, _, _, roundAddress := adaptors.OptionsExercised(junoEvent)
		err = db.UpdateOptionBuyerFields(
			buyerAddress,
			roundAddress,
			map[string]interface{}{
				"has_minted": true,
			})
	case "UnusedBidsRefunded":
		buyerAddress, _, roundAddress := adaptors.UnusedBidsRefunded(junoEvent)
		err = db.UpdateOptionBuyerFields(
			buyerAddress,
			roundAddress,
			map[string]interface{}{
				"has_refunded": true,
			})
	}
	if err != nil {
		return err
	}
	return nil
}
