-- Add session_mode column (replaces jam_mode boolean with a 3-way enum)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_mode text NOT NULL DEFAULT 'host'
  CHECK (session_mode IN ('host', 'jam', 'solo'));

-- Migrate existing jam_mode data
UPDATE public.sessions SET session_mode = 'jam' WHERE jam_mode = true;

-- Drop old jam-mode RLS policy
DROP POLICY IF EXISTS "Participants update when jam" ON public.sessions;

-- New RLS: host can always update; anyone can update when session_mode = 'jam'
CREATE POLICY "session_mode_control" ON public.sessions
  FOR UPDATE USING (
    host_id = auth.uid()
    OR session_mode = 'jam'
    OR host_id IS NULL
  );
