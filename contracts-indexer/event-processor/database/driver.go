package database

import (
	"event-processor/models"
	"log"
)

func (db *DB) CatchupDriverEvents() error {

	//Loop infinitely until no catchup events found
	for {
		events, err := db.GetUnprocessedDriverEvents()
		if err != nil {
			return err
		}
		if events == nil {
			log.Printf("No unprocessed driver events")
			break
		}
		log.Printf("Processing %d driver events", len(events))
		for _, event := range events {
			log.Printf("Processing driver event: %v", event)
			if event.SequenceIndex > 3 {
			}
			err := db.processDriverEvent(*event)
			if err != nil {
				log.Printf("Error processing driver event: %v", err)
				return err
			}
		}
	}
	return nil
}

func (db *DB) processDriverEvent(driverEventData models.DriverEvent) error {
	err := db.BeginTx()
	if err != nil {
		return err
	}
	log.Printf("Processing driver event: %v", driverEventData)
	switch driverEventData.Type {
	case "StartBlock":
		log.Printf("Processing NewBlock driver event")
		events, err := db.GetEventsByBlockHash(*driverEventData.BlockHash, "ASC")
		log.Printf("Processing %d events", len(events))
		if err != nil {
			db.logger.Printf("Error getting events by block number: %v", err)
			return err
		}
		for _, event := range events {
			err := db.processVaultEvent(event)
			if err != nil {
				db.RollbackTx()
				db.logger.Printf("Error processing event: %v", err)
				return err
			}
		}

	case "RevertBlock":
		events, err := db.GetEventsByBlockHash(*driverEventData.BlockHash, "DESC")
		if err != nil {
			db.logger.Printf("Error getting events by block number: %v", err)
			return err
		}
		for _, event := range events {
			err := db.revertVaultEvent(event)
			if err != nil {
				db.RollbackTx()
				db.logger.Printf("Error reverting event: %v", err)
				return err
			}
		}

	case "CatchupVault":
		log.Printf("Processing CatchupVault driver event")
		events, err := db.GetEventsForVault(*driverEventData.VaultAddress, *driverEventData.StartBlockHash, *driverEventData.EndBlockHash)
		if err != nil {
			db.logger.Printf("Error getting events by block number: %v", err)
			return err
		}
		log.Printf("Processing %d events", len(events))
		for _, event := range events {
			err := db.processVaultEvent(event)
			if err != nil {
				db.RollbackTx()
				db.logger.Printf("Error processing event: %v", err)
				return err
			}
		}
	}
	db.MarkDriverEventAsProcessed(driverEventData.ID)
	db.CommitTx()
	return nil
}
