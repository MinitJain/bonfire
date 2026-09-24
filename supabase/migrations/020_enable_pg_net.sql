-- ============================================================
-- Bonfire v2: Enable pg_net extension
-- ============================================================
-- pg_net allows PostgreSQL to make async HTTP requests.
-- Used by the bonfire_notify_edge() trigger to POST state
-- changes to the Edge Function for Realtime publication.

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Configure app.settings so the trigger can read the Edge Function URL.
-- These values are set via ALTER DATABASE and are accessible via
-- current_setting('app.settings.<key>') inside PL/pgSQL.
-- Replace 'YOUR_SUPABASE_URL' with the actual Supabase project URL
-- (e.g., https://xyzcompany.supabase.co).
--
-- These are also set as Supabase Edge Function secrets for the relay function.
