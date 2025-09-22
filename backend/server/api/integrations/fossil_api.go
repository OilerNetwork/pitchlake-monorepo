package integrations

import (
	"fmt"
	"io"
	"net/http"
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
