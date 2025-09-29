package vault

import (
	"context"
	"errors"
	"log"
	"net/http"

	"pitchlake-backend/server/api/integrations"
	"pitchlake-backend/server/types"

	"github.com/coder/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
)

func (router *VaultRouter) subscribeVaultHandler(w http.ResponseWriter, r *http.Request) {
	err := router.subscribeVault(r.Context(), w, r)
	if errors.Is(err, context.Canceled) {
		return
	}
	if websocket.CloseStatus(err) == websocket.StatusNormalClosure ||
		websocket.CloseStatus(err) == websocket.StatusGoingAway {
		return
	}
	if err != nil {
		router.log.Printf("%v", err)
		return
	}
}

func (router *VaultRouter) sendJobRequestHandler(w http.ResponseWriter, r *http.Request) {
	err := router.sendJobRequest(r.Context(), w, r)
	if errors.Is(err, context.Canceled) {
		return
	}
}

func NewVaultRouter(serveMux *http.ServeMux, logger *log.Logger, fossilAPI *integrations.FossilAPI, pool *pgxpool.Pool) *VaultRouter {
	router := &VaultRouter{ //nolint:exhaustruct
		Subscribers: SubscribersWithLock{ //nolint:exhaustruct
			List: make(map[string][]*types.SubscriberVault),
		},
		log:       logger,
		fossilAPI: fossilAPI,
		pool:      pool,
	}
	serveMux.HandleFunc("/subscribeVault", router.subscribeVaultHandler)
	serveMux.HandleFunc("/sendJobRequest", router.sendJobRequestHandler)
	return router
}
