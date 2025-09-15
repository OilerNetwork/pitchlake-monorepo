-- Rollback migration for fossil database blockheaders table

-- Drop indexes
DROP INDEX IF EXISTS blockheaders_number_idx;
DROP INDEX IF EXISTS blockheaders_timestamp_idx;

-- Drop table
DROP TABLE IF EXISTS blockheaders; 