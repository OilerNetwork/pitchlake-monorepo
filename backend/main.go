package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"pitchlake-backend/constants"
	"pitchlake-backend/server"

	"github.com/joho/godotenv"
)

func main() {
	log.SetFlags(0)

	// Load env
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
	ctx, cancel := context.WithTimeout(context.Background(), constants.HTTPStartTimeout)
	defer cancel()
	dbs := server.NewDBServer(ctx)
	s := &http.Server{ //nolint:exhaustruct
		Addr:         ":8080",
		Handler:      dbs,
		ReadTimeout:  constants.HTTPReadTimeout,
		WriteTimeout: constants.HTTPWriteTimeout,
	}
	errc := make(chan error, 1)
	log.Printf("server started at %v", s.Addr)
	go func() {
		errc <- s.ListenAndServe()
	}()

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, os.Interrupt)
	select {
	case err := <-errc:
		log.Printf("failed to serve: %v", err)
	case sig := <-sigs:
		log.Printf("terminating: %v", sig)
	}

	return s.Shutdown(ctx)
}
