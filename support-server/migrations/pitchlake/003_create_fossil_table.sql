CREATE TABLE IF NOT EXISTS public.job_requests
(
    vault_address varchar(66) NOT NULL,
    job_id varchar(66) NOT NULL,
    status varchar(20) NOT NULL,
    round_id INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT job_requests_pkey PRIMARY KEY (job_id),
    CONSTRAINT job_requests_vault_round_key UNIQUE (vault_address, round_id, created_at)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_job_requests_vault_address ON job_requests(vault_address);
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON job_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_requests_round_id ON job_requests(round_id);
