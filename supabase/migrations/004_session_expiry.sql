-- Add last_active_at column for session expiry tracking
-- MANUAL STEP REQUIRED: run `supabase db push` after applying

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_sessions_last_active_at ON sessions (last_active_at);

-- Rename trigger function to reflect it sets both timestamps
CREATE OR REPLACE FUNCTION update_session_timestamps()
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
