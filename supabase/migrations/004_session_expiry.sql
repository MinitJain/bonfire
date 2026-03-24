-- Add last_active_at column for session expiry tracking
-- MANUAL STEP REQUIRED: run `supabase db push` after applying

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Update trigger to also set last_active_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_active_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- pg_cron job to delete sessions older than 7 days (requires pg_cron extension)
-- Enable with: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-old-sessions', '0 3 * * *', $$
--   DELETE FROM sessions WHERE last_active_at < now() - interval '7 days';
-- $$);
