package main

import (
	"event-processor/database"
	"fmt"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	log.SetFlags(0)

	//Load env
	_ = godotenv.Load(".env")
	err := run()
	if err != nil {
		log.Fatal(err)
	}
}

// run starts a http.Server for the passed in address
// with all requests handled by echoServer.
// NOTE: Triggers for the DB are created once and not mentioned in the plugin code
// LP Trigger: lp_row_update
// Vault Trigger: vault_update
// State Transition: state_transition(can be OR trigger on the state field)
// OB Trigger: ob_update
// OR Trigger:or_update
func run() error {

	db, err := database.NewDB()
	if err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}
	err = db.CatchupDriverEvents()
	if err != nil {
		return fmt.Errorf("failed to catchup driver events: %w", err)
	}
	db.Listener()
	return nil
}
