-- ============================================================
-- Bonfire v2: Idempotent pomodoro logging in complete_phase
-- ============================================================
-- Problem: complete_phase increments bonfires.completed_pomodoros
-- but never inserts into pomodoro_logs.
--
-- Fix: When a focus phase completes, insert one record into
-- pomodoro_logs with ON CONFLICT DO NOTHING for idempotency.
-- Profile stats are updated inline (not via increment_profile_stats)
-- to avoid a duplicate pomodoro_logs insert.

-- 1. Add pomodoro_number column for idempotent deduplication
ALTER TABLE public.pomodoro_logs
  ADD COLUMN IF NOT EXISTS pomodoro_number integer;

-- 2. Unique partial index: one log per (bonfire, pomodoro number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pomodoro_logs_bonfire_number
  ON public.pomodoro_logs (bonfire_id, pomodoro_number)
  WHERE bonfire_id IS NOT NULL;

-- 3. Updated complete_phase with pomodoro logging + profile stats
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
  v_focus_minutes integer;
  v_last_active date;
  v_today date := current_date;
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

    -- Log the completed pomodoro (idempotent via unique partial index)
    v_focus_minutes := least(greatest(v_bonfire.focus_duration / 60, 1), 180);
    INSERT INTO public.pomodoro_logs (bonfire_id, user_id, duration_minutes, pomodoro_number)
    VALUES (p_bonfire_id, v_bonfire.initiator_id, v_focus_minutes, v_completed_pomodoros)
    ON CONFLICT (bonfire_id, pomodoro_number) WHERE bonfire_id IS NOT NULL DO NOTHING;

    -- Update profile stats if authenticated (mirrors increment_profile_stats logic
    -- without the pomodoro_logs insert, which we already did above)
    IF v_bonfire.initiator_id IS NOT NULL THEN
      SELECT last_active_date INTO v_last_active
      FROM public.profiles WHERE id = v_bonfire.initiator_id FOR UPDATE;

      IF v_last_active = v_today - 1 THEN
        UPDATE public.profiles SET
          total_pomodoros     = total_pomodoros + 1,
          total_focus_minutes = total_focus_minutes + v_focus_minutes,
          current_streak      = current_streak + 1,
          longest_streak      = greatest(longest_streak, current_streak + 1),
          last_active_date    = v_today
        WHERE id = v_bonfire.initiator_id;
      ELSIF v_last_active = v_today THEN
        UPDATE public.profiles SET
          total_pomodoros     = total_pomodoros + 1,
          total_focus_minutes = total_focus_minutes + v_focus_minutes
        WHERE id = v_bonfire.initiator_id;
      ELSE
        UPDATE public.profiles SET
          total_pomodoros     = total_pomodoros + 1,
          total_focus_minutes = total_focus_minutes + v_focus_minutes,
          current_streak      = 1,
          longest_streak      = greatest(longest_streak, 1),
          last_active_date    = v_today
        WHERE id = v_bonfire.initiator_id;
      END IF;
    END IF;

    IF v_bonfire.current_round % v_bonfire.rounds_before_long = 0 THEN
      v_new_phase := 'long';
      v_new_time_left := v_bonfire.long_duration;
    ELSE
      v_new_phase := 'short';
      v_new_time_left := v_bonfire.short_duration;
    END IF;
    v_new_round := v_bonfire.current_round;
  ELSE
    -- Break completed: back to focus, no pomodoro log
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
