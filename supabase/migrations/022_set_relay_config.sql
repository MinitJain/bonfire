-- ============================================================
-- Bonfire v2: Configure relay pipeline via config table
-- ============================================================
-- The trigger function reads relay config from a table instead
-- of app.settings. This avoids requiring ALTER DATABASE and
-- makes configuration portable.

-- Config table for relay settings (SECURITY DEFINER access only)
CREATE TABLE IF NOT EXISTS public.bonfire_relay_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- No RLS policies = no direct access via PostgREST
-- Only SECURITY DEFINER functions (like the trigger) can read this.

-- Insert the known Supabase project URL
INSERT INTO public.bonfire_relay_config (key, value)
VALUES ('supabase_url', 'https://pygqbkhilukeymzexzbq.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Insert the anon key for Edge Function authentication.
-- The Edge Function uses its built-in SUPABASE_SERVICE_ROLE_KEY for
-- privileged operations (Realtime broadcast). The anon key here is
-- only used to authenticate the HTTP request to the Edge Function.
INSERT INTO public.bonfire_relay_config (key, value)
VALUES ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z3Fia2hpbHVrZXltemV4emJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTEzNjQsImV4cCI6MjA4OTY4NzM2NH0.UEoZQtPXys3Igo-OsfoAAs5DNwBhoMJjVjqPMJiJ3b4')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Update the trigger to read from config table
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

  SELECT value INTO v_url FROM public.bonfire_relay_config WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM public.bonfire_relay_config WHERE key = 'supabase_anon_key';

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
