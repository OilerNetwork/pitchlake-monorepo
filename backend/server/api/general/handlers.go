package general

import (
	"context"
	"errors"
	"log"
	"net/http"

	"pitchlake-backend/server/types"

	"github.com/coder/websocket"
)

func (router *GeneralRouter) subscribeGasDataHandler(w http.ResponseWriter, r *http.Request) {
	err := router.subscribeGasData(r.Context(), w, r)
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

func (router *GeneralRouter) healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte("OK")); err != nil {
		log.Printf("Error writing response: %v", err)
	}
}

func NewGeneralRouter(serveMux *http.ServeMux, logger *log.Logger) *GeneralRouter {
	router := &GeneralRouter{ //nolint:exhaustruct
		Subscribers: SubscribersWithLock{ //nolint:exhaustruct
			List: make(map[*types.SubscriberGas]struct{}),
		},
		log: logger,
	}
	serveMux.HandleFunc("/health", router.healthCheckHandler)
	serveMux.HandleFunc("/subscribeGas", router.subscribeGasDataHandler)
	return router
}
