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
-- WITH CHECK (1) prevents a participant from flipping session_mode away from 'jam'
-- to gain host-level control mid-session, and (2) prevents any participant from
-- changing host_id (ownership theft) — even in jam mode where the USING clause
-- would otherwise allow the update.
CREATE POLICY "session_mode_control" ON public.sessions
  FOR UPDATE USING (
    host_id = auth.uid()
    OR session_mode = 'jam'
    OR host_id IS NULL
  )
  WITH CHECK (
    (
      host_id = auth.uid()
      OR session_mode = 'jam'
      OR host_id IS NULL
    )
    AND (
      -- host_id must not change unless the updater is the current host.
      -- Subquery reads the existing row so we can compare old vs new host_id.
      host_id IS NOT DISTINCT FROM (SELECT s.host_id FROM public.sessions s WHERE s.id = sessions.id)
      OR auth.uid() = (SELECT s.host_id FROM public.sessions s WHERE s.id = sessions.id)
    )
  );
