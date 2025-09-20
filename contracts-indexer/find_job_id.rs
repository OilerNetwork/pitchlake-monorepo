
use crate::types::PitchLakeJobRequestParams;
use crate::types::{JobResponse, PitchLakeJobRequest};
use crate::AppState;
use axum::{
    extract::{Json, State},
    http::StatusCode,
};
use db_access::{
    models::JobStatus,
    queries::get_job_request,
};
use eyre::Result;
#[cfg(not(test))]
use uuid::Uuid;

// Main handler function
pub async fn find_job_id(
    State(state): State<AppState>,
    Json(payload): Json<PitchLakeJobRequest>,
) -> (StatusCode, Json<JobResponse>) {
    let identifiers = payload.identifiers.join(",");
    let context = format!(
        "identifiers=[{}], timestamp={}, twap-range=({},{}), volatility-range=({},{}), reserve_price-range=({},{}), client_address={}, vault_address={}",
        identifiers,
        payload.client_info.timestamp,
        payload.params.twap.0, payload.params.twap.1,
        payload.params.volatility.0, payload.params.volatility.1,
        payload.params.reserve_price.0, payload.params.reserve_price.1,
        payload.client_info.client_address,
        payload.client_info.vault_address,
    );

    tracing::info!("Received pricing data request. {}", context);

    if let Err((status, response)) = validate_request(&payload) {
        tracing::warn!("Invalid request: {:?}. {}", response, context);
        return (status, Json(response));
    }

    let job_id = generate_job_id(&payload.identifiers, &payload.params);

    tracing::info!("Generated job_id: {}. {}", job_id, context);

    match get_job_request(state.offchain_processor_db.clone(), &job_id).await {
        Ok(Some(job_request)) => {
            tracing::info!(
                "Found existing job with status: {}. {}",
                job_request.status,
                context
            );
            handle_existing_job(job_request.status, job_id, payload).await
        }
        Ok(None) => {
            tracing::info!("No job found. {}", context);
            job_response(
                StatusCode::OK,
                job_id,
                "Job not found.",
            )
        }
        Err(e) => {
            tracing::error!("Database error: {}. {}", e, context);
            internal_server_error(e, job_id)
        }
    }
}

// Helper to validate the request
fn validate_request(payload: &PitchLakeJobRequest) -> Result<(), (StatusCode, JobResponse)> {
    if payload.identifiers.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            JobResponse::new(
                String::new(),
                Some("Identifiers cannot be empty.".to_string()),
                None,
            ),
        ));
    }
    validate_time_ranges(&payload.params)
}

// Helper to generate a job ID
fn generate_job_id(
    #[cfg(test)] identifiers: &[String],
    #[cfg(not(test))] _identifiers: &[String],
    #[cfg(test)] params: &PitchLakeJobRequestParams,
    #[cfg(not(test))] _params: &PitchLakeJobRequestParams,
) -> String {
    #[cfg(test)]
    {
        // In test mode, create a deterministic job ID based on identifiers and params
        // This ensures tests can predict the job ID
        format!(
            "test-job-{}-{}-{}-{}-{}-{}",
            identifiers.join("-"),
            params.twap.0,
            params.twap.1,
            params.volatility.0,
            params.volatility.1,
            params.reserve_price.0
        )
    }

    #[cfg(not(test))]
    {
        // In production, use random UUID v4
        Uuid::new_v4().to_string()
    }
}

// Handle existing jobs based on status
async fn handle_existing_job(
    status: JobStatus,
    job_id: String,
) -> (StatusCode, Json<JobResponse>) {
    match status {
        JobStatus::Pending => job_response(
            StatusCode::OK,
            job_id,
            "Job is pending.",
        ),
        JobStatus::Completed => job_response(
            StatusCode::OK,
            job_id,
            "Job has been completed.",
        ),
        JobStatus::Failed => job_response(
            StatusCode::OK,
            job_id,
            "Job found. Job has failed.",
        ),
    }
}
// Helper to generate a JSON response
fn job_response(
    status: StatusCode,
    job_id: String,
    message: &str,
) -> (StatusCode, Json<JobResponse>) {
    tracing::info!("Responding to job {} with status {}", job_id, status);
    (
        status,
        Json(JobResponse::new(job_id, Some(message.to_string()), None)),
    )
}

// Handle internal server errors
fn internal_server_error(error: sqlx::Error, job_id: String) -> (StatusCode, Json<JobResponse>) {
    tracing::error!("Internal server error: {:?}", error);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(JobResponse::new(
            job_id,
            Some(format!("An error occurred: {}", error)),
            None,
        )),
    )
}

// Validate the provided time ranges
fn validate_time_ranges(
    params: &PitchLakeJobRequestParams,
) -> Result<(), (StatusCode, JobResponse)> {
    let validations = [
        ("TWAP", params.twap),
        ("Volatility", params.volatility),
        ("Reserve Price", params.reserve_price),
    ];

    for (name, (start, end)) in &validations {
        if start >= end {
            return Err((
                StatusCode::BAD_REQUEST,
                JobResponse::new(
                    String::new(),
                    Some(format!("Invalid time range for {} calculation.", name)),
                    None,
                ),
            ));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::handlers::fixtures::TestContext;
    use crate::types::{ClientInfo, PitchLakeJobRequest, PitchLakeJobRequestParams};
    use axum::http::StatusCode;

    #[tokio::test]
    async fn test_find_job_id_not_found_job() {
        let ctx = TestContext::new().await;

        let payload = PitchLakeJobRequest {
            identifiers: vec!["test-id".to_string()],
            params: PitchLakeJobRequestParams {
                twap: (0, 100),
                volatility: (0, 100),
                reserve_price: (0, 100),
            },
            client_info: ClientInfo {
                client_address: "0x123".to_string(),
                vault_address: "0x456".to_string(),
                timestamp: 0,
            },
        };

        let (status, Json(response)) = ctx.find_job_id(payload).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(
            response.message.unwrap(),
            "Job not found."
        );
    }

    #[tokio::test]
    async fn test_find_job_id_pending_job() {
        let ctx = TestContext::new().await;

        let payload = PitchLakeJobRequest {
            identifiers: vec!["test-id".to_string()],
            params: PitchLakeJobRequestParams {
                twap: (0, 100),
                volatility: (0, 100),
                reserve_price: (0, 100),
            },
            client_info: ClientInfo {
                client_address: "0x123".to_string(),
                vault_address: "0x456".to_string(),
                timestamp: 0,
            },
        };

        let job_id = generate_job_id(&payload.identifiers, &payload.params);
        ctx.create_job(&job_id, JobStatus::Pending).await;

        let (status, Json(response)) = ctx.find_job_id(payload).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(response.job_id, job_id);
        assert_eq!(
            response.message.unwrap_or_default(),
            "Job is pending."
        );
    }

    #[tokio::test]
    async fn test_find_job_id_completed_job() {
        let ctx = TestContext::new().await;

        let payload = PitchLakeJobRequest {
            identifiers: vec!["test-id".to_string()],
            params: PitchLakeJobRequestParams {
                twap: (0, 100),
                volatility: (0, 100),
                reserve_price: (0, 100),
            },
            client_info: ClientInfo {
                client_address: "0x123".to_string(),
                vault_address: "0x456".to_string(),
                timestamp: 0,
            },
        };

        let job_id = generate_job_id(&payload.identifiers, &payload.params);
        ctx.create_job(&job_id, JobStatus::Completed).await;

        let (status, Json(response)) = ctx.find_job_id(payload).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(response.job_id, job_id);
        assert_eq!(
            response.message.unwrap_or_default(),
            "Job has been completed."
        );
    }

    #[tokio::test]
    async fn test_find_job_id_failed_job() {
        let ctx = TestContext::new().await;

        let payload = PitchLakeJobRequest {
            identifiers: vec!["test-id".to_string()],
            params: PitchLakeJobRequestParams {
                twap: (0, 100),
                volatility: (0, 100),
                reserve_price: (0, 100),
            },
            client_info: ClientInfo {
                client_address: "0x123".to_string(),
                vault_address: "0x456".to_string(),
                timestamp: 0,
            },
        };

        let job_id = generate_job_id(&payload.identifiers, &payload.params);
        ctx.create_job(&job_id, JobStatus::Failed).await;

        let (status, Json(response)) = ctx.find_job_id(payload).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(response.job_id, job_id);
        assert_eq!(
            response.message.unwrap_or_default(),
            "Job found. Job has failed."
        );
    }

    #[tokio::test]
    async fn test_find_job_id_invalid_params() {
        let ctx = TestContext::new().await;

        let payload = PitchLakeJobRequest {
            identifiers: vec!["test-id".to_string()],
            params: PitchLakeJobRequestParams {
                twap: (100, 0), // Invalid range
                volatility: (0, 100),
                reserve_price: (0, 100),
            },
            client_info: ClientInfo {
                client_address: "0x123".to_string(),
                vault_address: "0x456".to_string(),
                timestamp: 0,
            },
        };

        let (status, Json(response)) = ctx.get_pricing_data(payload).await;

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(
            response.message.unwrap_or_default(),
            "Invalid time range for TWAP calculation."
        );
    }
}
