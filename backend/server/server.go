package server

import (
	"context"
	"log"
	"net/http"
	"os"
	"pitchlake-backend/db"
	"pitchlake-backend/server/api/general"
	"pitchlake-backend/server/api/home"
	"pitchlake-backend/server/api/integrations"
	"pitchlake-backend/server/api/vault"
)

// dbServer enables broadcasting to a set of subscribers.

type dbServer struct {
	subscriberMessageBuffer int
	db                      *db.DB
	log                     log.Logger
	serveMux                http.ServeMux
	ctx                     context.Context
	cancel                  context.CancelFunc
}

// newdbServer constructs a dbServer with the defaults.
// Create a custom context for the server here and pass it to the db package
func NewDBServer(ctx context.Context) *dbServer {

	ctx, cancel := context.WithCancel(ctx)
	db, err := db.NewDB()
	if err != nil {
		log.Fatal("Failed to load db", err)
	}
	dbs := &dbServer{
		log:    *log.Default(),
		db:     db,
		ctx:    ctx,
		cancel: cancel,
	}
	// Create FossilAPI instance
	fossilAPI := integrations.NewFossilAPI(
		os.Getenv("FOSSIL_API_KEY"),
		os.Getenv("FOSSIL_API_URL"),
	)

	homeRouter := home.NewHomeRouter(&dbs.serveMux, &dbs.log)
	vaultRouter := vault.NewVaultRouter(&dbs.serveMux, &dbs.log, fossilAPI, dbs.db.Pool)
	generalRouter := general.NewGeneralRouter(&dbs.serveMux, &dbs.log, dbs.db.Pool)
	go dbs.listener(ctx, vaultRouter.Subscribers.List, homeRouter.Subscribers.List, generalRouter.Subscribers.List)
	return dbs
}

func (dbs *dbServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Add CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Handle preflight OPTIONS requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	dbs.serveMux.ServeHTTP(w, r)
}
