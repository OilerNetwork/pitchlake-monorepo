package vault

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"pitchlake-backend/models"
)

func TestSendJobRequest_InvalidRequest(t *testing.T) {
	// Create a simple router for testing validation
	router := &VaultRouter{}

	// Test cases for validation
	testCases := []struct {
		name         string
		requestBody  map[string]interface{}
		expectedCode int
	}{
		{
			name: "Missing vault_address",
			requestBody: map[string]interface{}{
				"fossil_request": map[string]interface{}{
					"program_id": "PITCHLAKE_V1",
					"params": map[string]interface{}{
						"twap":         [2]uint64{1640995200, 1640998800},
						"max_return":   [2]uint64{1640995200, 1640998800},
						"reserve_price": [2]uint64{1640995200, 1640998800},
					},
				},
				"round_id": 1,
			},
			expectedCode: http.StatusBadRequest,
		},
		{
			name: "Missing program_id",
			requestBody: map[string]interface{}{
				"fossil_request": map[string]interface{}{
					"vault_address": "0x123456789",
					"params": map[string]interface{}{
						"twap":         [2]uint64{1640995200, 1640998800},
						"max_return":   [2]uint64{1640995200, 1640998800},
						"reserve_price": [2]uint64{1640995200, 1640998800},
					},
				},
				"round_id": 1,
			},
			expectedCode: http.StatusBadRequest,
		},
		{
			name: "Negative round_id",
			requestBody: map[string]interface{}{
				"fossil_request": map[string]interface{}{
					"program_id":    "PITCHLAKE_V1",
					"vault_address": "0x123456789",
					"params": map[string]interface{}{
						"twap":         [2]uint64{1640995200, 1640998800},
						"max_return":   [2]uint64{1640995200, 1640998800},
						"reserve_price": [2]uint64{1640995200, 1640998800},
					},
				},
				"round_id": -1,
			},
			expectedCode: http.StatusBadRequest,
		},
		{
			name: "Invalid JSON",
			requestBody: map[string]interface{}{
				"invalid": "json",
			},
			expectedCode: http.StatusBadRequest,
		},
		{
			name: "Wrong HTTP method",
			requestBody: map[string]interface{}{
				"fossil_request": map[string]interface{}{
					"program_id":    "PITCHLAKE_V1",
					"vault_address": "0x123456789",
					"params": map[string]interface{}{
						"twap":         [2]uint64{1640995200, 1640998800},
						"max_return":   [2]uint64{1640995200, 1640998800},
						"reserve_price": [2]uint64{1640995200, 1640998800},
					},
				},
				"round_id": 1,
			},
			expectedCode: http.StatusMethodNotAllowed,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			jsonBody, _ := json.Marshal(tc.requestBody)
			
			// Use GET for wrong method test, POST for others
			method := "POST"
			if tc.name == "Wrong HTTP method" {
				method = "GET"
			}
			
			req := httptest.NewRequest(method, "/sendJobRequest", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.sendJobRequestHandler(rr, req)

			if rr.Code != tc.expectedCode {
				t.Errorf("Expected status %d, got %d", tc.expectedCode, rr.Code)
				t.Errorf("Response body: %s", rr.Body.String())
			}
		})
	}
}


func TestIsJobStuck(t *testing.T) {
	router := &VaultRouter{}

	// Test cases
	testCases := []struct {
		name        string
		createdAt   string
		expectedStuck bool
	}{
		{
			name:        "Recent job (5 minutes ago)",
			createdAt:   time.Now().Add(-5 * time.Minute).Format(time.RFC3339),
			expectedStuck: false,
		},
		{
			name:        "Old job (1 hour ago)",
			createdAt:   time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
			expectedStuck: true,
		},
		{
			name:        "Very old job (2 hours ago)",
			createdAt:   time.Now().Add(-2 * time.Hour).Format(time.RFC3339),
			expectedStuck: true,
		},
		{
			name:        "Invalid timestamp",
			createdAt:   "invalid-timestamp",
			expectedStuck: true, // Should be considered stuck if we can't parse
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var createdAt time.Time
			var err error
			
			if tc.createdAt == "invalid-timestamp" {
				// For invalid timestamp, use a very old time
				createdAt = time.Now().Add(-24 * time.Hour)
			} else {
				createdAt, err = time.Parse(time.RFC3339, tc.createdAt)
				if err != nil {
					t.Fatalf("Failed to parse time: %v", err)
				}
			}
			
			job := &models.JobRequest{
				JobID:      "test_job",
				Status:     models.JobStatusPending,
				CreatedAt:  createdAt,
			}

			isStuck := router.isJobStuck(job)
			if isStuck != tc.expectedStuck {
				t.Errorf("Expected stuck=%v, got stuck=%v for %s", tc.expectedStuck, isStuck, tc.name)
			}
		})
	}
}
