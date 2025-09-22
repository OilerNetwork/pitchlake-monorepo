-- Drop trigger
DROP TRIGGER IF EXISTS notify_unconfirmed_insert_trigger ON blocks;

-- Drop functions
DROP FUNCTION IF EXISTS notify_confirmed_insert();
DROP FUNCTION IF EXISTS notify_unconfirmed_insert();
