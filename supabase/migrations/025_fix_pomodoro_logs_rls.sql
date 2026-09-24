-- Fix RLS policy blocking pomodoro_logs inserts from SECURITY DEFINER functions.
-- The existing policy "Users can insert own logs" requires auth.uid() = user_id,
-- which blocks anon inserts where both are NULL (guest-created bonfires).
-- Add a permissive INSERT policy for bonfire logs (bonfire_id IS NOT NULL).

CREATE POLICY "Bonfire logs can be inserted"
  ON public.pomodoro_logs
  FOR INSERT
  TO public
  WITH CHECK (bonfire_id IS NOT NULL);
