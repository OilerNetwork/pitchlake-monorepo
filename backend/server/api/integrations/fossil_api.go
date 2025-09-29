package integrations

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"pitchlake-backend/models"
)

type FossilAPI struct {
	apiKey      string
	apiUrl      string
	mockService *MockFossilService
	isDevMode   bool
}

func NewFossilAPI(apiKey string, apiUrl string) *FossilAPI {
	// Check if we're in dev mode
	devMode := os.Getenv("DEV_MODE") == "true"

	// print devmod
	fmt.Printf("Fossil API - Dev Mode: %v\n", devMode)

	var mockService *MockFossilService
	var err error

	if devMode {
		// Initialize mock service for development
		mockService, err = NewMockFossilService()
		if err != nil {
			fmt.Printf("Warning: Failed to initialize mock fossil service: %v\n", err)
			fmt.Printf("Falling back to regular Fossil API\n")
			devMode = false
		}
	}

	return &FossilAPI{
		apiKey:      apiKey,
		apiUrl:      apiUrl,
		mockService: mockService,
		isDevMode:   devMode,
	}
}

func (f *FossilAPI) RequestPricingData() error {
	return nil
}

// SendFossilRequest sends a request to the Fossil API or mock service
func (f *FossilAPI) SendFossilRequest(request models.FossilRequest) (*struct {
	JobID  string `json:"job_id"`
	Status string `json:"status"`
}, error) {
	// If in dev mode and mock service is available, use mock service
	if f.isDevMode && f.mockService != nil {
		fmt.Printf("Using mock fossil service for development\n")
		return f.mockService.SendMockFossilRequest(request)
	}

	// Otherwise, use the regular Fossil API
	fmt.Printf("Using regular Fossil API\n")
	return f.sendRealFossilRequest(request)
}

// sendRealFossilRequest sends a request to the real Fossil API
func (f *FossilAPI) sendRealFossilRequest(request models.FossilRequest) (*struct {
	JobID  string `json:"job_id"`
	Status string `json:"status"`
}, error) {
	// Convert to the format expected by Fossil API
	fossilPayload := map[string]interface{}{
		"program_id":    request.ProgramID,
		"vault_address": request.VaultAddress,
		"params": map[string]interface{}{
			"twap":          request.Params.Twap,
			"max_return":    request.Params.MaxReturn,
			"reserve_price": request.Params.ReservePrice,
		},
	}

	jsonData, err := json.Marshal(fossilPayload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/pricing_data", f.apiUrl), bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", f.apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Log the response for debugging
	fmt.Printf("Fossil API Response - Status: %d, Body: %s\n", resp.StatusCode, string(body))

	// Check if the response is successful (200-299 range)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("fossil API error: %s", string(body))
	}

	var response struct {
		JobID  string `json:"job_id"`
		Status string `json:"status"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to parse fossil API response: %v, body: %s", err, string(body))
	}

	return &response, nil
}

func (f *FossilAPI) GetJobStatus(jobId string) (*string, error) {
	// If in dev mode and this is a mock job, return completed status
	if f.isDevMode && f.mockService != nil && len(jobId) > 9 && jobId[:9] == "mock_job_" {
		status := "completed"
		return &status, nil
	}

	// Otherwise, query the real Fossil API
	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/job_status/%s", f.apiUrl, jobId), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-api-key", f.apiKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	status := string(body)
	return &status, nil
}
