-- ============================================================
-- Order Bonfire state updates
-- ============================================================
-- Every change to a bonfire row is relayed with its own asynchronous
-- pg_net request (bonfire_state_change -> bonfire-relay -> Realtime).
-- Requests are not delivered in order, so a client could receive
-- "running" after "paused" and show a timer the server has stopped.
-- An RPC result and a late broadcast of an earlier command race the
-- same way on the client that issued the command.
--
-- version increases by one on every UPDATE of the row. It travels in
-- RPC results and relay payloads (both to_jsonb(bonfires.*)), and
-- clients ignore any state older than the one they already hold.

ALTER TABLE public.bonfires
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.bump_bonfire_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bonfires_version ON public.bonfires;
CREATE TRIGGER bonfires_version
  BEFORE UPDATE ON public.bonfires
  FOR EACH ROW EXECUTE FUNCTION public.bump_bonfire_version();

GRANT SELECT (version) ON public.bonfires TO anon, authenticated;
