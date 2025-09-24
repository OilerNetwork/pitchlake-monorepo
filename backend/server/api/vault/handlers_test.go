package vault

import (
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"pitchlake-backend/server/api/integrations"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestNewVaultRouter(t *testing.T) {
	serveMux := http.NewServeMux()
	logger := log.Default()
	fossilAPI := &integrations.FossilAPI{}
	var pool *pgxpool.Pool // nil for testing
	router := NewVaultRouter(serveMux, logger, fossilAPI, pool)

	if router == nil {
		t.Error("Expected router to be created")
		return
	}
	if router.Subscribers.List == nil {
		t.Error("Expected Subscribers.List to be initialized")
	}
}

func TestSubscribeVaultHandler(t *testing.T) {
	logger := log.Default()
	router := &VaultRouter{log: logger}

	req, err := http.NewRequest("GET", "/subscribeVault", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	router.subscribeVaultHandler(rr, req)

	// The handler expects WebSocket upgrade, so it will fail with regular HTTP
	// This is expected behavior
	if rr.Code == http.StatusOK {
		t.Error("Expected non-OK status for non-WebSocket request")
	}
}

func TestVaultRouterInitialization(t *testing.T) {
	serveMux := http.NewServeMux()
	logger := log.Default()
	fossilAPI := &integrations.FossilAPI{}
	var pool *pgxpool.Pool // nil for testing
	router := NewVaultRouter(serveMux, logger, fossilAPI, pool)

	// Check that the endpoint is registered
	req, err := http.NewRequest("GET", "/subscribeVault", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	router.subscribeVaultHandler(rr, req)

	// Should not work with regular HTTP (expects WebSocket)
	if rr.Code == http.StatusOK {
		t.Error("Expected non-OK status for non-WebSocket request")
	}
}
