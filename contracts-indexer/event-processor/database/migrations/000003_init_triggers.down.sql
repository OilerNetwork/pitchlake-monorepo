DROP TRIGGER IF EXISTS lp_update ON public."liquidity_providers";
DROP TRIGGER IF EXISTS or_update ON public."option_rounds";
DROP TRIGGER IF EXISTS vault_update ON public."vault_states";
DROP TRIGGER IF EXISTS ob_update ON public."option_buyers";

DROP TRIGGER IF EXISTS bids_insert_trigger ON public."bids";
DROP TRIGGER IF EXISTS bids_update_trigger ON public."bids";
DROP TRIGGER IF EXISTS or_insert ON public."option_rounds";
DROP TRIGGER IF EXISTS vault_insert_trigger ON public."vault_states";