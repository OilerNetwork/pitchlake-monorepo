CREATE TABLE IF NOT EXISTS public.job_requests
(
    vault_address varchar(66) NOT NULL,
    job_id varchar(66) NOT NULL,
    status varchar(20) NOT NULL,
    CONSTRAINT job_requests_pkey PRIMARY KEY (job_id),
    CONSTRAINT job_requests_vault_address_key UNIQUE (vault_address)
);
