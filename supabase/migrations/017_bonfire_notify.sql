-- ============================================================
-- Bonfire v2: Database-originated Realtime publication
-- ============================================================
-- After any committed state change to a bonfires row, pg_net
-- POSTs the full row to the Edge Function, which publishes
-- the authoritative state to the Supabase Realtime channel.
--
-- Architecture:
--   1. Client sends RPC command
--   2. RPC function transitions state in the database (single transaction)
--   3. AFTER trigger fires (only on committed changes)
--   4. Trigger queries the full bonfire row
--   5. pg_net sends HTTP POST to Edge Function
--   6. Edge Function publishes state_update to Realtime channel
--   7. All subscribed clients receive the authoritative state

-- Drop the old BEFORE trigger that used pg_notify
DROP TRIGGER IF EXISTS bonfire_state_change ON public.bonfires;
DROP FUNCTION IF EXISTS public.bonfire_state_notify();

-- AFTER trigger: fires only after transaction commit
CREATE OR REPLACE FUNCTION public.bonfire_notify_edge()
RETURNS TRIGGER AS $$
DECLARE
  v_row jsonb;
  v_url text;
  v_key text;
BEGIN
  -- Query the full row (AFTER trigger, data is committed)
  SELECT to_jsonb(b.*) INTO v_row
  FROM public.bonfires b
  WHERE b.id = NEW.id;

  -- Build Edge Function URL
  v_url := current_setting('app.settings.supabase_url', true)
           || '/functions/v1/bonfire-relay';

  v_key := current_setting('app.settings.service_role_key', true);

  -- Fire-and-forget HTTP POST via pg_net
  -- The Edge Function publishes to Supabase Realtime
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := v_row
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER bonfire_state_change
  AFTER INSERT OR UPDATE ON public.bonfires
  FOR EACH ROW
  EXECUTE FUNCTION public.bonfire_notify_edge();
