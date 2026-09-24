-- Fix SELECT RLS policy for pomodoro_logs.
-- The existing "Users can view own logs" requires auth.uid() = user_id,
-- which blocks reading bonfire logs where user_id IS NULL.
-- Add a permissive SELECT policy for bonfire logs.

CREATE POLICY "Bonfire logs can be viewed"
  ON public.pomodoro_logs
  FOR SELECT
  TO public
  USING (bonfire_id IS NOT NULL);
