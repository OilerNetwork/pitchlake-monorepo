package repositories

import (
	"context"
	"fmt"
	"pitchlake-backend/models"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// JobRequestRepository handles job request database operations
type JobRequestRepository struct {
	pool *pgxpool.Pool
}

// NewJobRequestRepository creates a new job request repository
func NewJobRequestRepository(pool *pgxpool.Pool) *JobRequestRepository {
	return &JobRequestRepository{pool: pool}
}

// GetLatestJobRequestByVaultAndRound retrieves the latest job request for a vault and round
func (r *JobRequestRepository) GetLatestJobRequestByVaultAndRound(ctx context.Context, vaultAddress string, roundID int) (*models.JobRequest, error) {
	if r.pool == nil {
		return nil, fmt.Errorf("database pool is nil")
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT job_id, status, vault_address, round_id, created_at
		FROM job_requests
		WHERE vault_address = $1 AND round_id = $2
		ORDER BY created_at DESC
		LIMIT 1
	`

	var job models.JobRequest
	var createdAt time.Time
	err := r.pool.QueryRow(ctx, query, vaultAddress, roundID).Scan(
		&job.JobID, &job.Status, &job.VaultAddress, &job.RoundID, &createdAt,
	)
	job.CreatedAt = createdAt

	if err == pgx.ErrNoRows {
		return nil, nil // No job found
	}
	if err != nil {
		return nil, fmt.Errorf("error querying job request: %w", err)
	}

	return &job, nil
}

// InsertJobRequest inserts a new job request
func (r *JobRequestRepository) InsertJobRequest(ctx context.Context, vaultAddress, jobID string, status models.JobStatus, roundID int) error {
	if r.pool == nil {
		return fmt.Errorf("database pool is nil")
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		INSERT INTO job_requests (vault_address, job_id, status, round_id, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := r.pool.Exec(ctx, query, vaultAddress, jobID, status, roundID, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("error inserting job request: %w", err)
	}

	return nil
}

// UpdateJobRequestStatus updates the status of a job request
func (r *JobRequestRepository) UpdateJobRequestStatus(ctx context.Context, jobID string, status models.JobStatus) error {
	if r.pool == nil {
		return fmt.Errorf("database pool is nil")
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `UPDATE job_requests SET status = $1 WHERE job_id = $2`
	_, err := r.pool.Exec(ctx, query, status, jobID)
	if err != nil {
		return fmt.Errorf("error updating job request status: %w", err)
	}

	return nil
}
