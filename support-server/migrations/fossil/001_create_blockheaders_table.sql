-- Create blockheaders table for fossil database (local development only)
-- This table is used to get block data from the fossil database

CREATE TABLE IF NOT EXISTS public.blockheaders (
    number numeric(30,0) NOT NULL,
    timestamp numeric(30,0) NOT NULL,
    base_fee_per_gas numeric(30,9),
    CONSTRAINT blockheaders_pkey PRIMARY KEY (number)
);

-- Create index on number for efficient ordering
CREATE INDEX IF NOT EXISTS blockheaders_number_idx ON blockheaders(number);
CREATE INDEX IF NOT EXISTS blockheaders_timestamp_idx ON blockheaders(timestamp);

-- Insert some sample data for local development
INSERT INTO blockheaders (number, timestamp, base_fee_per_gas) VALUES 
    (18000000, 1695000000, 20000000000),
    (18000001, 1695000060, 21000000000),
    (18000002, 1695000120, 19500000000),
    (18000003, 1695000180, 22000000000),
    (18000004, 1695000240, 20500000000)
ON CONFLICT (number) DO NOTHING; 