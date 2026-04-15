-- Add is_public column to sessions
-- true  = shows on explore (default, backwards-compatible)
-- false = invite-link only; still visible on explore but locked/limited preview
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Only the host may change room visibility.
-- Must be RESTRICTIVE so Postgres ANDs it with existing policies instead of ORing —
-- otherwise jam participants can still toggle is_public via the permissive 006 policy.
DROP POLICY IF EXISTS "sessions_update_is_public_host_only" ON public.sessions;

CREATE POLICY "sessions_update_is_public_host_only" ON public.sessions
  AS RESTRICTIVE
  FOR UPDATE USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);
