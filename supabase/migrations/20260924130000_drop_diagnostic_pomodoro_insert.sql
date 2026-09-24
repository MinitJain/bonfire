-- ============================================================
-- Security cleanup: remove the diagnostic function from 026/027
-- ============================================================
-- test_pomodoro_insert() was a temporary debugging helper. It is
-- SECURITY DEFINER and was granted to anon/authenticated, letting any
-- client write rows into pomodoro_logs for arbitrary bonfire ids.

DROP FUNCTION IF EXISTS public.test_pomodoro_insert(text);

-- Remove rows written by that function. Its inserts have a fixed,
-- unmistakable signature: no user, no v1 session, 30 minutes, and
-- pomodoro_number 999 (real bonfire logs number completed focuses 1, 2, 3...).
DELETE FROM public.pomodoro_logs
WHERE pomodoro_number = 999
  AND user_id IS NULL
  AND session_id IS NULL
  AND duration_minutes = 30
  AND bonfire_id IS NOT NULL;
