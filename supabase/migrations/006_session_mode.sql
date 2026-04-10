-- Add session_mode column (replaces jam_mode boolean with a 3-way enum)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_mode text NOT NULL DEFAULT 'host'
  CHECK (session_mode IN ('host', 'jam', 'solo'));

-- Migrate existing jam_mode data
UPDATE public.sessions SET session_mode = 'jam' WHERE jam_mode = true;

-- Drop old jam-mode RLS policy
DROP POLICY IF EXISTS "Participants update when jam" ON public.sessions;

-- Index for queries filtering by session_mode (explore, solo redirect, etc.)
CREATE INDEX IF NOT EXISTS idx_sessions_session_mode ON public.sessions(session_mode);

-- New RLS: host can always update; anyone can update when session_mode = 'jam'
-- WITH CHECK prevents a participant from flipping session_mode away from 'jam'
-- to gain host-level control mid-session.
CREATE POLICY "session_mode_control" ON public.sessions
  FOR UPDATE USING (
    host_id = auth.uid()
    OR session_mode = 'jam'
    OR host_id IS NULL
  )
  WITH CHECK (
    host_id = auth.uid()
    OR session_mode = 'jam'
    OR host_id IS NULL
  );
