-- Extend the host-only trigger to also protect session_mode and settings columns,
-- not just is_public (which was the only column guarded in migration 009).
--
-- Guest-hosted sessions (host_id IS NULL): auth.uid() is also NULL for the guest host,
-- and NULL IS DISTINCT FROM NULL = false, so the check passes — this correctly allows
-- the guest host to change host-only columns. It also means any anonymous caller could
-- technically change these columns if they call the API directly. A proper fix would
-- require a durable guest_host_id token column, which is a larger schema change.
-- For now we document the limitation and rely on the client-side isHost guard.
CREATE OR REPLACE FUNCTION public.prevent_is_public_change_by_non_host()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.is_public    IS DISTINCT FROM OLD.is_public    OR
    NEW.session_mode IS DISTINCT FROM OLD.session_mode OR
    NEW.settings     IS DISTINCT FROM OLD.settings
  ) THEN
    -- For authenticated hosts (host_id NOT NULL): only the host may change these columns.
    -- For guest hosts (host_id IS NULL): auth.uid() is also NULL, so IS DISTINCT FROM
    -- returns false and the block is skipped — guest host can change their own columns.
    IF auth.uid() IS DISTINCT FROM OLD.host_id THEN
      RAISE EXCEPTION 'Only the host can change room visibility, mode, or settings';
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
