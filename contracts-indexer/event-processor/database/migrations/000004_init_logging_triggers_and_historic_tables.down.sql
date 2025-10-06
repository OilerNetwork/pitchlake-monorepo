-- Drop triggers
DROP TRIGGER IF EXISTS lp_log_update ON public."liquidity_providers";
DROP TRIGGER IF EXISTS vault_log_update ON public."vault_states";

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.log_lp_update;
DROP FUNCTION IF EXISTS public.log_vault_update;

-- Drop tables