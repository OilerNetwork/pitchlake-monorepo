package integrations

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"pitchlake-backend/models"
)

type FossilAPI struct {
	apiKey string
	apiUrl string
}

func NewFossilAPI(apiKey string, apiUrl string) *FossilAPI {
	return &FossilAPI{
		apiKey: apiKey,
		apiUrl: apiUrl,
	}
}

func (f *FossilAPI) RequestPricingData() error {
	return nil
}

// SendFossilRequest sends a request to the Fossil API
func (f *FossilAPI) SendFossilRequest(request models.FossilRequest) (*struct {
	JobID  string `json:"job_id"`
	Status string `json:"status"`
}, error) {
	// Convert to the format expected by Fossil API
	fossilPayload := map[string]interface{}{
		"program_id":    request.ProgramID,
		"vault_address": request.VaultAddress,
		"params": map[string]interface{}{
			"twap":         request.Params.Twap,
			"max_return":   request.Params.MaxReturn,
			"reserve_price": request.Params.ReservePrice,
		},
	}

	jsonData, err := json.Marshal(fossilPayload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/pricing_data", f.apiUrl), bytes.NewBuffer(jsonData))
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
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/job_status/%s", f.apiUrl, jobId), nil)
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
