-- Fix double-wrapped to_jsonb return values in all RPC functions.
-- Pattern: v_bonfire record + returning to_jsonb(bonfires.*) into v_bonfire
-- then return to_jsonb(v_bonfire) produces {"to_jsonb": {...}}.
-- Fix: use separate v_result jsonb for RETURNING INTO.

CREATE OR REPLACE FUNCTION public.start_timer(
  p_bonfire_id text,
  p_token text DEFAULT null
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bonfire record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT public.can_control_bonfire(v_bonfire, p_token) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_bonfire.running THEN RAISE EXCEPTION 'Timer already running'; END IF;

  UPDATE public.bonfires SET
    running = true,
    started_at = (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.pause_timer(
  p_bonfire_id text,
  p_token text DEFAULT null
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bonfire record;
  v_result jsonb;
  v_elapsed integer;
  v_new_time_left integer;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT public.can_control_bonfire(v_bonfire, p_token) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT v_bonfire.running THEN RAISE EXCEPTION 'Timer not running'; END IF;

  v_elapsed := greatest(0, floor((EXTRACT(EPOCH FROM now()) * 1000 - v_bonfire.started_at) / 1000))::integer;
  v_new_time_left := greatest(0, v_bonfire.time_left - v_elapsed);

  UPDATE public.bonfires SET
    running = false,
    time_left = v_new_time_left,
    started_at = null,
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.skip_phase(
  p_bonfire_id text,
  p_token text DEFAULT null
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bonfire record;
  v_result jsonb;
  v_new_phase text;
  v_new_round integer;
  v_new_time_left integer;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT public.can_control_bonfire(v_bonfire, p_token) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF v_bonfire.phase = 'focus' THEN
    IF v_bonfire.current_round % v_bonfire.rounds_before_long = 0 THEN
      v_new_phase := 'long';
      v_new_time_left := v_bonfire.long_duration;
    ELSE
      v_new_phase := 'short';
      v_new_time_left := v_bonfire.short_duration;
    END IF;
    v_new_round := v_bonfire.current_round;
  ELSE
    v_new_phase := 'focus';
    v_new_time_left := v_bonfire.focus_duration;
    v_new_round := v_bonfire.current_round + 1;
  END IF;

  UPDATE public.bonfires SET
    phase = v_new_phase,
    running = false,
    time_left = v_new_time_left,
    started_at = null,
    current_round = v_new_round,
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_phase(
  p_bonfire_id text,
  p_token text DEFAULT null
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bonfire record;
  v_result jsonb;
  v_elapsed integer;
  v_new_phase text;
  v_new_round integer;
  v_new_time_left integer;
  v_completed_pomodoros integer;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT v_bonfire.running THEN RAISE EXCEPTION 'Timer not running'; END IF;

  v_elapsed := greatest(0, floor((EXTRACT(EPOCH FROM now()) * 1000 - v_bonfire.started_at) / 1000))::integer;
  IF v_bonfire.time_left - v_elapsed > 0 THEN
    RAISE EXCEPTION 'Timer has not expired yet';
  END IF;

  v_completed_pomodoros := v_bonfire.completed_pomodoros;

  IF v_bonfire.phase = 'focus' THEN
    v_completed_pomodoros := v_completed_pomodoros + 1;
    IF v_bonfire.current_round % v_bonfire.rounds_before_long = 0 THEN
      v_new_phase := 'long';
      v_new_time_left := v_bonfire.long_duration;
    ELSE
      v_new_phase := 'short';
      v_new_time_left := v_bonfire.short_duration;
    END IF;
    v_new_round := v_bonfire.current_round;
  ELSE
    v_new_phase := 'focus';
    v_new_time_left := v_bonfire.focus_duration;
    v_new_round := v_bonfire.current_round + 1;
  END IF;

  UPDATE public.bonfires SET
    phase = v_new_phase,
    running = false,
    time_left = v_new_time_left,
    started_at = null,
    current_round = v_new_round,
    completed_pomodoros = v_completed_pomodoros,
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_result;

  RETURN v_result;
END;
$$;

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
  v_elapsed integer;
  v_new_time_left integer;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT public.can_control_bonfire(v_bonfire, p_token) THEN RAISE EXCEPTION 'Not authorized'; END IF;

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

  IF v_bonfire.running THEN
    v_elapsed := greatest(0, floor((EXTRACT(EPOCH FROM now()) * 1000 - v_bonfire.started_at) / 1000))::integer;
    v_new_time_left := greatest(0, v_bonfire.time_left - v_elapsed);

    UPDATE public.bonfires SET
      running = false,
      time_left = CASE
        WHEN v_bonfire.phase = 'focus' THEN coalesce(p_focus_duration, focus_duration)
        WHEN v_bonfire.phase = 'short' THEN coalesce(p_short_duration, short_duration)
        ELSE coalesce(p_long_duration, long_duration)
      END,
      started_at = null,
      last_active_at = now()
    WHERE id = p_bonfire_id
    RETURNING to_jsonb(bonfires.*) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_mode(
  p_bonfire_id text,
  p_token text DEFAULT null
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bonfire record;
  v_result jsonb;
  v_new_mode text;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire has ended'; END IF;
  IF NOT public.is_bonfire_initiator(v_bonfire, p_token) THEN
    RAISE EXCEPTION 'Only the initiator can toggle mode';
  END IF;

  v_new_mode := CASE WHEN v_bonfire.session_mode = 'focus' THEN 'jam' ELSE 'focus' END;

  UPDATE public.bonfires SET
    session_mode = v_new_mode,
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_bonfire(
  p_bonfire_id text,
  p_token text DEFAULT null
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bonfire record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_bonfire FROM public.bonfires WHERE id = p_bonfire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_bonfire.status = 'ended' THEN RAISE EXCEPTION 'Bonfire already ended'; END IF;
  IF NOT public.is_bonfire_initiator(v_bonfire, p_token) THEN
    RAISE EXCEPTION 'Only the initiator can end the bonfire';
  END IF;

  UPDATE public.bonfires SET
    status = 'ended',
    running = false,
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_result;

  RETURN v_result;
END;
$$;
