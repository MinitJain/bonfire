-- ============================================================
-- change_settings: one UPDATE per command
-- ============================================================
-- The relay trigger fires after every UPDATE. change_settings used two
-- UPDATEs in one transaction (durations, then clock), so clients received
-- two state_update broadcasts, the first with the new durations but the old
-- time_left. pg_net delivers them asynchronously and out of order, so a
-- client could be left showing the half-applied state.
--
-- Same results as 20260924140000, computed up front and written once:
--   running          → paused, clock reset to the current phase's new duration
--   paused, current phase's duration changed → clock shows the new duration
--   otherwise        → clock unchanged
-- Authorization is unchanged.

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
  v_focus integer;
  v_short integer;
  v_long integer;
  v_old_phase_duration integer;
  v_new_phase_duration integer;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT public.can_control_bonfire(v_bonfire, p_token) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  v_focus := coalesce(p_focus_duration, v_bonfire.focus_duration);
  v_short := coalesce(p_short_duration, v_bonfire.short_duration);
  v_long  := coalesce(p_long_duration, v_bonfire.long_duration);

  v_old_phase_duration := CASE
    WHEN v_bonfire.phase = 'focus' THEN v_bonfire.focus_duration
    WHEN v_bonfire.phase = 'short' THEN v_bonfire.short_duration
    ELSE v_bonfire.long_duration
  END;
  v_new_phase_duration := CASE
    WHEN v_bonfire.phase = 'focus' THEN v_focus
    WHEN v_bonfire.phase = 'short' THEN v_short
    ELSE v_long
  END;

  UPDATE public.bonfires SET
    focus_duration = v_focus,
    short_duration = v_short,
    long_duration = v_long,
    rounds_before_long = coalesce(p_rounds_before_long, rounds_before_long),
    session_mode = coalesce(p_session_mode, session_mode),
    running = false,
    time_left = CASE
      WHEN v_bonfire.running OR v_new_phase_duration IS DISTINCT FROM v_old_phase_duration
        THEN v_new_phase_duration
      ELSE time_left
    END,
    started_at = CASE WHEN v_bonfire.running THEN NULL ELSE started_at END,
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_result;

  RETURN v_result - 'initiator_token';
END;
$$;
