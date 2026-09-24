-- ============================================================
-- Validate Bonfire settings on the server
-- ============================================================
-- create_bonfire and change_settings stored whatever durations a client
-- sent. Home now lets the creator choose a focus length and rounds, so
-- the ranges the UI offers (lib/bonfire.ts SETTING_LIMITS) are enforced
-- here too, in seconds:
--
--   focus  1..120 min   short rest 1..30 min   long rest 1..60 min
--   rounds before the long rest 1..12
--
-- Checked in the functions rather than as table constraints, so existing
-- rows are never rejected retroactively. Behaviour is otherwise unchanged.

CREATE OR REPLACE FUNCTION public.assert_bonfire_settings(
  p_focus_duration integer,
  p_short_duration integer,
  p_long_duration integer,
  p_rounds_before_long integer
)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF p_focus_duration IS NULL OR p_focus_duration NOT BETWEEN 60 AND 7200 THEN
    RAISE EXCEPTION 'Focus must be between 1 and 120 minutes';
  END IF;
  IF p_short_duration IS NULL OR p_short_duration NOT BETWEEN 60 AND 1800 THEN
    RAISE EXCEPTION 'Short rest must be between 1 and 30 minutes';
  END IF;
  IF p_long_duration IS NULL OR p_long_duration NOT BETWEEN 60 AND 3600 THEN
    RAISE EXCEPTION 'Long rest must be between 1 and 60 minutes';
  END IF;
  IF p_rounds_before_long IS NULL OR p_rounds_before_long NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'Rounds must be between 1 and 12';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_bonfire_settings(integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;

-- ─── create_bonfire ─────────────────────────────────────────
-- Same as 20260924120000, plus the settings check.
CREATE OR REPLACE FUNCTION public.create_bonfire(
  p_initiator_name text DEFAULT 'Someone',
  p_focus_duration integer DEFAULT 1500,
  p_short_duration integer DEFAULT 300,
  p_long_duration integer DEFAULT 900,
  p_rounds_before_long integer DEFAULT 4,
  p_session_mode text DEFAULT 'focus'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id text;
  v_join_code text;
  v_token text;
  v_bonfire jsonb;
BEGIN
  PERFORM public.assert_bonfire_settings(
    p_focus_duration, p_short_duration, p_long_duration, p_rounds_before_long
  );

  v_id := public.generate_bonfire_id();
  v_token := public.generate_initiator_token();

  LOOP
    v_join_code := public.generate_join_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bonfires WHERE join_code = v_join_code);
  END LOOP;

  INSERT INTO public.bonfires (
    id, join_code, initiator_id, initiator_token, initiator_name,
    focus_duration, short_duration, long_duration, rounds_before_long,
    session_mode, time_left
  ) VALUES (
    v_id, v_join_code,
    auth.uid(),
    v_token,
    p_initiator_name,
    p_focus_duration, p_short_duration, p_long_duration, p_rounds_before_long,
    p_session_mode,
    p_focus_duration
  )
  RETURNING to_jsonb(bonfires.*) INTO v_bonfire;

  -- The creator is the only caller that ever receives the token.
  RETURN v_bonfire;
END;
$$;

-- ─── change_settings ────────────────────────────────────────
-- Same as 20260924150000, plus the settings check on the merged values.
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
  v_rounds integer;
  v_old_phase_duration integer;
  v_new_phase_duration integer;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT public.can_control_bonfire(v_bonfire, p_token) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  v_focus  := coalesce(p_focus_duration, v_bonfire.focus_duration);
  v_short  := coalesce(p_short_duration, v_bonfire.short_duration);
  v_long   := coalesce(p_long_duration, v_bonfire.long_duration);
  v_rounds := coalesce(p_rounds_before_long, v_bonfire.rounds_before_long);

  PERFORM public.assert_bonfire_settings(v_focus, v_short, v_long, v_rounds);

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
    rounds_before_long = v_rounds,
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
