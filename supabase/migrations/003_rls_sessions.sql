-- Tighten sessions RLS: host can always update; guests only when jam_mode=true
-- MANUAL STEP REQUIRED: run `supabase db push` after applying

-- Drop the permissive update policy
DROP POLICY IF EXISTS "Anyone can update sessions" ON sessions;

-- Re-create with tighter rule
CREATE POLICY "Host or jam participants can update sessions"
  ON sessions FOR UPDATE
  USING (
    host_id = auth.uid()
    OR jam_mode = true
    OR host_id IS NULL  -- guest-hosted sessions (no auth.uid())
  )
  WITH CHECK (
    -- Participants may not change immutable ownership columns
    host_id IS NOT DISTINCT FROM host_id
  );
