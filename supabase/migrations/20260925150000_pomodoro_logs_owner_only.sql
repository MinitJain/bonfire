-- ============================================================
-- pomodoro_logs: people can only see (and write) their own
-- ============================================================
-- 025 and 028 added two permissive policies for public (anon included):
--
--   "Bonfire logs can be viewed"    FOR SELECT USING (bonfire_id IS NOT NULL)
--   "Bonfire logs can be inserted"  FOR INSERT WITH CHECK (bonfire_id IS NOT NULL)
--
-- Policies are OR'd, so with the anon key anyone could read every Bonfire
-- log (user_id + completed_at: when each signed-in person focused) and
-- insert logs attributed to any user.
--
-- Neither is needed. Logs are written only by SECURITY DEFINER functions
-- (complete_phase), which run as the table owner and are not subject to
-- RLS. Clients read only their own rows (profile stats, "N today"), which
-- "Users can view own logs" (auth.uid() = user_id) already allows.
--
-- Guest-only logs (user_id NULL) become unreadable by clients; nothing
-- reads them.

DROP POLICY IF EXISTS "Bonfire logs can be viewed" ON public.pomodoro_logs;
DROP POLICY IF EXISTS "Bonfire logs can be inserted" ON public.pomodoro_logs;
