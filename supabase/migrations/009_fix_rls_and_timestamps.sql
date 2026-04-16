-- Fix 1: Drop the RESTRICTIVE policy from migration 007.
-- It used USING (auth.uid() = host_id) which blocked ALL updates from:
--   - guest hosts (host_id IS NULL, auth.uid() = NULL → NULL = NULL → NULL = falsy)
--   - jam watchers (auth.uid() ≠ host_id → false)
-- This caused sessions to never set running=true, so explore showed nothing.
DROP POLICY IF EXISTS "sessions_update_is_public_host_only" ON public.sessions;

-- Fix 2: Replace with a trigger that enforces the original intent more precisely —
-- only the host may change is_public, but all other column updates are unrestricted.
CREATE OR REPLACE FUNCTION public.prevent_is_public_change_by_non_host()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    -- NULL IS DISTINCT FROM NULL = false, so guest hosts (both NULL) pass through.
    -- Authenticated watchers (auth.uid() ≠ host_id) are blocked.
    IF auth.uid() IS DISTINCT FROM OLD.host_id THEN
      RAISE EXCEPTION 'Only the host can change room visibility';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sessions_is_public_host_only ON public.sessions;
CREATE TRIGGER sessions_is_public_host_only
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_is_public_change_by_non_host();

-- Fix 3: The trigger from migration 001 (sessions_updated_at) calls
-- update_updated_at_column() which only sets updated_at.
-- Migration 004 created update_session_timestamps() that sets both, but never
-- wired it to the trigger. Fix by updating the original function in-place so
-- the existing trigger now also keeps last_active_at fresh on every UPDATE.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_active_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
