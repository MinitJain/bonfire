-- ============================================================
-- Bonfire v2: Fix pg_net notification pipeline + jam mode auth
-- ============================================================
-- Root cause: Migration 020 was named "enable_pg_net" but
-- actually enabled pgcrypto. The trigger function reads
-- current_setting('app.settings.supabase_url', true) which
-- returns NULL when unconfigured. NULL || text = NULL in
-- PostgreSQL, so net.http_post(url := NULL) violates the
-- NOT NULL constraint on http_request_queue.url.
--
-- Additionally, the trigger crashes the entire transaction on
-- failure, which blocks bonfire creation when the Edge Function
-- pipeline is not configured.
--
-- Fixes:
--   1. Ensure pg_net is enabled
--   2. Resilient trigger: skip notification if settings missing,
--      catch exceptions so bonfire creation always succeeds
--   3. bonfire_participants table for jam mode guest authorization
--   4. join_bonfire RPC to generate participant credentials

-- ─── 1. Enable pg_net ───────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── 2. Replace trigger with resilient version ──────────────
CREATE OR REPLACE FUNCTION public.bonfire_notify_edge()
RETURNS TRIGGER AS $$
DECLARE
  v_row jsonb;
  v_url text;
  v_key text;
BEGIN
  SELECT to_jsonb(b.*) INTO v_row
  FROM public.bonfires b
  WHERE b.id = NEW.id;

  v_url := current_setting('app.settings.supabase_url', true);
  v_key := current_setting('app.settings.service_role_key', true);

  IF v_url IS NULL OR v_url = '' OR v_key IS NULL OR v_key = '' THEN
    RETURN NEW;
  END IF;

  v_url := v_url || '/functions/v1/bonfire-relay';

  BEGIN
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key,
        'apikey', v_key
      ),
      body := v_row
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'bonfire-relay notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Jam mode: participant credential table ──────────────
CREATE TABLE IF NOT EXISTS public.bonfire_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bonfire_id text NOT NULL REFERENCES public.bonfires(id) ON DELETE CASCADE,
  participant_token text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bonfire_id, participant_token)
);

ALTER TABLE public.bonfire_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bonfire_participants_bonfire_id
  ON public.bonfire_participants(bonfire_id);
CREATE INDEX IF NOT EXISTS idx_bonfire_participants_token
  ON public.bonfire_participants(participant_token);

-- ─── 4. join_bonfire RPC ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_bonfire(
  p_bonfire_id text,
  p_name text DEFAULT 'Guest'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token text;
  v_bonfire record;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires
  WHERE id = p_bonfire_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bonfire not found';
  END IF;

  IF v_bonfire.status != 'active' THEN
    RAISE EXCEPTION 'This bonfire has ended';
  END IF;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  INSERT INTO public.bonfire_participants (bonfire_id, participant_token, name)
  VALUES (p_bonfire_id, v_token, p_name);

  RETURN jsonb_build_object(
    'participant_token', v_token,
    'bonfire_id', p_bonfire_id
  );
END;
$$;

-- ─── 5. Fix can_control_bonfire for jam mode ────────────────
CREATE OR REPLACE FUNCTION public.can_control_bonfire(
  p_bonfire record,
  p_token text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_bonfire_initiator(p_bonfire, p_token) THEN
    RETURN true;
  END IF;

  IF p_bonfire.session_mode = 'jam' AND auth.uid() IS NOT NULL THEN
    RETURN true;
  END IF;

  IF p_bonfire.session_mode = 'jam' AND p_token IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.bonfire_participants
      WHERE bonfire_id = p_bonfire.id AND participant_token = p_token
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- ─── 6. Grants ──────────────────────────────────────────────
GRANT SELECT ON public.bonfires TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_bonfire TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_timer TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pause_timer TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.skip_phase TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_phase TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_settings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_mode TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.end_bonfire TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_join_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_bonfire TO anon, authenticated;
