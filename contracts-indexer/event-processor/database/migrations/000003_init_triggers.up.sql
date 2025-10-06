
-- Trigger: lp_update

CREATE TRIGGER lp_update
    AFTER UPDATE 
    ON public."liquidity_providers"
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_lp_update();


-- Trigger: or_update

CREATE TRIGGER or_update
    AFTER UPDATE 
    ON public."option_rounds"
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_or_update();

    CREATE TRIGGER or_insert
    AFTER INSERT 
    ON public."option_rounds"
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_or_update();

-- Trigger: vault_update


CREATE TRIGGER vault_update
    AFTER UPDATE 
    ON public."vault_states"
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_vault_update();

-- Trigger: ob_update

CREATE TRIGGER ob_update
    AFTER UPDATE 
    ON public."option_buyers"
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_ob_update();

CREATE TRIGGER bids_insert_trigger
AFTER INSERT ON public."bids"
FOR EACH ROW
EXECUTE FUNCTION public.notify_bids_channel();

CREATE TRIGGER bids_update_trigger
AFTER UPDATE ON public."bids"
FOR EACH ROW
EXECUTE FUNCTION public.notify_bids_channel();

CREATE TRIGGER vault_insert_trigger
AFTER INSERT
ON public."vault_states"
FOR EACH ROW
EXECUTE FUNCTION public.notify_vault_insert();