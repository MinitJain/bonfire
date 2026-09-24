-- ============================================================
-- Bonfire v2: optional Bonfire name, initiator display name,
-- and paused-duration changes applied immediately
-- ============================================================
--
-- 1. bonfires.name: optional, creator-set, max 40 characters.
--    Readable by clients (added to the column-level SELECT grant).
-- 2. set_bonfire_details(): initiator-only. Sets the Bonfire name and the
--    initiator's display name for this Bonfire (initiator_name), which
--    invitations use. Updating bonfires broadcasts via the existing trigger.
-- 3. change_settings(): when the timer is paused and the current phase's
--    duration changes, time_left becomes the new duration, so the clock
--    and the "25 · 5 · 15" line agree. The running case is unchanged.

-- ─── 1. Bonfire name ────────────────────────────────────────
ALTER TABLE public.bonfires
  ADD COLUMN IF NOT EXISTS name text
  CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 40);

GRANT SELECT (name) ON public.bonfires TO anon, authenticated;

-- ─── 2. set_bonfire_details ─────────────────────────────────
-- p_name:           NULL = leave unchanged, '' = clear, otherwise set
-- p_initiator_name: NULL or '' = leave unchanged, otherwise set
CREATE OR REPLACE FUNCTION public.set_bonfire_details(
  p_bonfire_id text,
  p_token text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_initiator_name text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bonfire record;
  v_result jsonb;
  v_name text;
  v_initiator_name text;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT public.is_bonfire_initiator(v_bonfire, p_token) THEN
    RAISE EXCEPTION 'Only the initiator can change the Bonfire name';
  END IF;

  v_name := CASE
    WHEN p_name IS NULL THEN v_bonfire.name
    ELSE left(nullif(btrim(p_name), ''), 40)
  END;
  v_initiator_name := coalesce(left(nullif(btrim(coalesce(p_initiator_name, '')), ''), 40), v_bonfire.initiator_name);

  UPDATE public.bonfires SET
    name = v_name,
    initiator_name = v_initiator_name,
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_result;

  RETURN v_result - 'initiator_token';
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_bonfire_details(text, text, text, text) TO anon, authenticated;

-- ─── 3. change_settings ─────────────────────────────────────
-- Identical to 20260924120000 except the new paused branch.
CREATE OR REPLACE FUNCTION public.change_settings(
  p_bonfire_id text,
  p_token text DEFAULT null,
  p_focus_duration integer DEFAULT null,
  p_short_duration integer DEFAULT null,
  p_long_duration integer DEFAULT null,
  p_rounds_before_long integer DEFAULT null,
  p_session_mode text DEFAULT null
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bonfire record;
  v_result jsonb;
  v_old_phase_duration integer;
  v_new_phase_duration integer;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT public.can_control_bonfire(v_bonfire, p_token) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  v_old_phase_duration := CASE
    WHEN v_bonfire.phase = 'focus' THEN v_bonfire.focus_duration
    WHEN v_bonfire.phase = 'short' THEN v_bonfire.short_duration
    ELSE v_bonfire.long_duration
  END;

  UPDATE public.bonfires SET
    focus_duration = coalesce(p_focus_duration, focus_duration),
    short_duration = coalesce(p_short_duration, short_duration),
    long_duration = coalesce(p_long_duration, long_duration),
    rounds_before_long = coalesce(p_rounds_before_long, rounds_before_long),
    session_mode = coalesce(p_session_mode, session_mode),
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_result;

  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;

  v_new_phase_duration := CASE
    WHEN v_bonfire.phase = 'focus' THEN v_bonfire.focus_duration
    WHEN v_bonfire.phase = 'short' THEN v_bonfire.short_duration
    ELSE v_bonfire.long_duration
  END;

  IF v_bonfire.running THEN
    -- Unchanged: a running phase is paused and restarted at its (new) duration.
    UPDATE public.bonfires SET
      running = false,
      time_left = v_new_phase_duration,
      started_at = null,
      last_active_at = now()
    WHERE id = p_bonfire_id
    RETURNING to_jsonb(bonfires.*) INTO v_result;
  ELSIF v_new_phase_duration IS DISTINCT FROM v_old_phase_duration THEN
    -- Paused (or not yet started): the current phase's length changed,
    -- so the clock shows the new length immediately.
    UPDATE public.bonfires SET
      time_left = v_new_phase_duration,
      last_active_at = now()
    WHERE id = p_bonfire_id
    RETURNING to_jsonb(bonfires.*) INTO v_result;
  END IF;

  RETURN v_result - 'initiator_token';
END;
$$;
