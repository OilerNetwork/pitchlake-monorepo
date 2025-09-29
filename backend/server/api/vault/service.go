package vault

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"pitchlake-backend/db/repositories"
	"pitchlake-backend/models"
	"pitchlake-backend/server/api/utils"
	"pitchlake-backend/server/types"
	"pitchlake-backend/server/validations"
	"sync"
	"time"

	"github.com/coder/websocket"
)

const (
	// DEFAULT_STUCK_JOB_TIMEOUT is the default maximum time a job can be pending before being considered stuck
	DEFAULT_STUCK_JOB_TIMEOUT = 10 * time.Minute
)

func (router *VaultRouter) subscribeVault(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	var mu sync.Mutex
	var c *websocket.Conn
	var closed bool
	// Extract address from the request and add here

	// allowedOrigin := os.Getenv("FRONTEND_URL")
	c2, err := websocket.Accept(w, r, &websocket.AcceptOptions{ //nolint:exhaustruct
		InsecureSkipVerify: true,
	})
	if err != nil {
		return err
	}
	defer c2.Close(websocket.StatusInternalError, "Internal server error")

	// Read the first message to get the subscription data
	_, msg, err := c2.Read(ctx)
	if err != nil {
		return err
	}

	var sm types.SubscriberMessage
	err = json.Unmarshal(msg, &sm)
	if err != nil {
		return err
	}

	// Validate subscription message
	if err := validations.ValidateSubscriptionMessage(sm); err != nil {
		log.Printf("Invalid subscription message: %v", err)
		// Send error response to client
		errorResponse := map[string]string{
			"error":   "Invalid subscription message",
			"details": err.Error(),
		}
		errorJson, _ := json.Marshal(errorResponse)
		if err := c2.Write(ctx, websocket.MessageText, errorJson); err != nil {
			log.Printf("Error writing to websocket: %v", err)
		}
		return err
	}

	log.Printf("%v", sm)

	s := &types.SubscriberVault{
		Address:      sm.Address,
		VaultAddress: sm.VaultAddress,
		UserType:     sm.UserType,
		Msgs:         make(chan []byte, router.subscriberMessageBuffer),
		CloseSlow: func() {
			mu.Lock()
			defer mu.Unlock()
			closed = true
			if c != nil {
				c.Close(websocket.StatusPolicyViolation, "connection too slow to keep up with messages")
			}
		},
	}
	router.addSubscriberVault(s)
	defer router.deleteSubscriberVault(s)

	mu.Lock()
	if closed {
		mu.Unlock()
		return net.ErrClosed
	}
	c = c2
	mu.Unlock()
	defer func() {
		if err := c.CloseNow(); err != nil {
			log.Printf("Error closing websocket: %v", err)
		}
	}()

	// Send initial payload here
	var payload InitialPayloadVault

	payload.PayloadType = "initial"

	// Create repositories
	vaultRepo := repositories.NewVaultRepository(router.pool)
	optionRoundRepo := repositories.NewOptionRepository(router.pool)
	optionBuyerRepo := repositories.NewOptionBuyerRepository(router.pool)
	lpRepo := repositories.NewLiquidityRepository(router.pool)

	vaultState, err := vaultRepo.GetVaultStateByID(ctx, s.VaultAddress)

	if err != nil {
		return err
	}
	optionRounds, err := optionRoundRepo.GetOptionRoundsByVaultAddress(ctx, s.VaultAddress)
	if err != nil {
		return err
	}
	payload.OptionRoundStates = optionRounds
	payload.VaultState = *vaultState
	lpState, err := lpRepo.GetLiquidityProviderStateByAddress(ctx, s.Address, s.VaultAddress)
	if err != nil {
		fmt.Printf("Error fetching lp state %v", err)
	} else {
		payload.LiquidityProviderState = *lpState
	}

	obStates, err := optionBuyerRepo.GetOptionBuyerByAddress(ctx, s.Address)
	if err != nil {
		fmt.Printf("Error fetching ob state %v", err)
	}
	payload.OptionBuyerStates = obStates

	// if sm.UserType == "lp" {

	// } else if sm.UserType == "ob" {

	// } else {
	// 	return errors.New("invalid user type")
	// }

	// Marshal the VaultState to a JSON byte array
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if err := utils.WriteTimeout(ctx, time.Second*5, c, jsonPayload); err != nil {
		log.Printf("Error writing timeout: %v", err)
	}
	go func() {
		for {
			var request types.SubscriberVaultRequest
			_, msg, err := c.Read(ctx)
			if err != nil {
				log.Printf("Error reading message: %v", err)
				break
			}
			log.Printf("Received message from client: %s", msg)
			err = json.Unmarshal(msg, &request)
			if err != nil {
				log.Printf("Incorrect message format: %v", err)
				break
			}

			// Validate vault request
			if err := validations.ValidateVaultRequest(request); err != nil {
				log.Printf("Invalid vault request: %v", err)
				// Send error response to client
				errorResponse := map[string]string{
					"error":   "Invalid vault request",
					"details": err.Error(),
				}
				errorJson, _ := json.Marshal(errorResponse)
				s.Msgs <- errorJson
				break
			}

			var payload InitialPayloadVault
			if request.UpdatedField == "address" {
				s.Address = request.UpdatedValue

				payload.PayloadType = "account_update"
				lpState, err := lpRepo.GetLiquidityProviderStateByAddress(ctx, s.Address, s.VaultAddress)
				if err != nil {
					fmt.Printf("Error fetching lp state %v", err)
				} else {
					payload.LiquidityProviderState = *lpState
				}

				obStates, err := optionBuyerRepo.GetOptionBuyerByAddress(ctx, s.Address)
				if err != nil {
					fmt.Printf("Error fetching ob state %v", err)
				}
				payload.OptionBuyerStates = obStates
			}
			jsonPayload, err := json.Marshal(payload)
			if err != nil {
				log.Printf("Incorrect response generated: %v", err)
			}
			s.Msgs <- jsonPayload
			log.Printf("Client Info %v", s)
			// Handle the received message here
		}
	}()
	for {
		select {
		case msg := <-s.Msgs:
			// Push messages received on the subscriber channel to the client
			err := utils.WriteTimeout(ctx, time.Second*5, c, msg)
			if err != nil {
				return err
			}
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

func (router *VaultRouter) addSubscriberVault(s *types.SubscriberVault) {
	router.Subscribers.mux.Lock()
	defer router.Subscribers.mux.Unlock()

	// Initialize the slice if it doesn't exist
	if _, exists := router.Subscribers.List[s.VaultAddress]; !exists {
		router.Subscribers.List[s.VaultAddress] = make([]*types.SubscriberVault, 0)
	}

	router.Subscribers.List[s.VaultAddress] = append(router.Subscribers.List[s.VaultAddress], s)
}

// deleteSubscriber deletes the given subscriber.
func (router *VaultRouter) deleteSubscriberVault(s *types.SubscriberVault) {
	router.Subscribers.mux.Lock()
	defer router.Subscribers.mux.Unlock()

	Subscribers, exists := router.Subscribers.List[s.VaultAddress]
	if !exists {
		return // Nothing to delete
	}

	for i, subscriber := range Subscribers {
		if subscriber == s {
			// Replace the element to be deleted with the last element
			Subscribers[i] = Subscribers[len(Subscribers)-1]
			// Truncate the slice
			router.Subscribers.List[s.VaultAddress] = Subscribers[:len(Subscribers)-1]
			break
		}
	}

	// If the slice is empty after deletion, remove the key from the map
	if len(router.Subscribers.List[s.VaultAddress]) == 0 {
		delete(router.Subscribers.List, s.VaultAddress)
	}
}

func (router *VaultRouter) sendJobRequest(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return fmt.Errorf("method not allowed: %s", r.Method)
	}

	var req struct {
		FossilRequest models.FossilRequest `json:"fossil_request"`
		RoundID       int                  `json:"round_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return nil
	}

	// Validate required fields
	if req.FossilRequest.VaultAddress == "" {
		http.Error(w, "vault_address is required", http.StatusBadRequest)
		return nil
	}
	if req.FossilRequest.ProgramID == "" {
		http.Error(w, "program_id is required", http.StatusBadRequest)
		return nil
	}
	if req.RoundID < 0 {
		http.Error(w, "round_id must be non-negative", http.StatusBadRequest)
		return nil
	}

	// Create job request repository
	jobRepo := repositories.NewJobRequestRepository(router.pool)

	// Get the latest job request for this vault and round
	latestJob, err := jobRepo.GetLatestJobRequestByVaultAndRound(ctx, req.FossilRequest.VaultAddress, req.RoundID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error getting latest job request: %v", err), http.StatusInternalServerError)
		return nil
	}

	// If there's a job request, refresh its status
	if latestJob != nil {
		refreshedJob, err := router.refreshJobStatus(ctx, latestJob, jobRepo)
		if err != nil {
			log.Printf("Error refreshing job status: %v", err)
			// Continue with the original job if refresh fails
			refreshedJob = latestJob
		}

		// If job is pending, check if it's stuck
		if refreshedJob.Status == models.JobStatusPending {
			// Check if the job has been pending for too long
			if router.isJobStuck(refreshedJob) {
				log.Printf("Job %s has been pending for too long, marking as failed", refreshedJob.JobID)

				// Mark the stuck job as failed
				err = jobRepo.UpdateJobRequestStatus(ctx, refreshedJob.JobID, models.JobStatusFailed)
				if err != nil {
					log.Printf("Error marking stuck job as failed: %v", err)
				}

				// Continue to send a new job below
			} else {
				// Job is still valid and pending
				response := models.SendJobRequestResponse{
					JobID:   refreshedJob.JobID,
					Status:  refreshedJob.Status,
					Message: "Job request is already pending",
				}
				w.Header().Set("Content-Type", "application/json")
				if err := json.NewEncoder(w).Encode(response); err != nil {
					log.Printf("Error encoding response: %v", err)
				}
				return nil
			}
		}

		// If job is completed, return it
		if refreshedJob.Status == models.JobStatusCompleted {
			response := models.SendJobRequestResponse{
				JobID:   refreshedJob.JobID,
				Status:  refreshedJob.Status,
				Message: "Job request is already completed",
			}
			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				log.Printf("Error encoding response: %v", err)
			}
			return nil
		}

		// If job failed, we'll send a new one below
	}

	// Send new job request to Fossil API
	jobResponse, err := router.fossilAPI.SendFossilRequest(ctx, req.FossilRequest)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error sending fossil request: %v", err), http.StatusInternalServerError)
		return nil
	}

	// Save to database
	err = jobRepo.InsertJobRequest(ctx, req.FossilRequest.VaultAddress, jobResponse.JobID, models.JobStatusPending, req.RoundID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error saving job request: %v", err), http.StatusInternalServerError)
		return nil
	}

	response := models.SendJobRequestResponse{
		JobID:   jobResponse.JobID,
		Status:  models.JobStatusPending,
		Message: "New job request sent successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
	return nil
}

// refreshJobStatus refreshes the status of a job from Fossil API
func (router *VaultRouter) refreshJobStatus(ctx context.Context, job *models.JobRequest, jobRepo *repositories.JobRequestRepository) (*models.JobRequest, error) {
	if job.Status == models.JobStatusFailed {
		return job, nil // Don't refresh failed jobs
	}

	statusStr, err := router.fossilAPI.GetJobStatus(ctx, job.JobID)
	if err != nil {
		return job, err
	}

	// Parse the status from Fossil API
	var fossilResponse struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal([]byte(*statusStr), &fossilResponse); err != nil {
		return job, err
	}

	// Update job status if it changed
	newStatus := models.JobStatus(fossilResponse.Status)
	if newStatus != job.Status {
		err = jobRepo.UpdateJobRequestStatus(ctx, job.JobID, newStatus)
		if err != nil {
			return job, err
		}
		job.Status = newStatus
	}

	return job, nil
}

// isJobStuck checks if a job has been pending for longer than the stuck timeout
func (router *VaultRouter) isJobStuck(job *models.JobRequest) bool {
	// Get the stuck timeout from environment variable or use default
	stuckTimeout := router.getStuckJobTimeout()

	// Convert both times to UTC for proper comparison
	now := time.Now().UTC()
	createdAt := job.CreatedAt.UTC()
	timeSince := now.Sub(createdAt)

	// Check if the job has been pending for longer than the timeout
	return timeSince > stuckTimeout
}

// getStuckJobTimeout returns the configured stuck job timeout
func (router *VaultRouter) getStuckJobTimeout() time.Duration {
	// This could be made configurable via environment variable in the future
	// For now, return the default
	return DEFAULT_STUCK_JOB_TIMEOUT
}
