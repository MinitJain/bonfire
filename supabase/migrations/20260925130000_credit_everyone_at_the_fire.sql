-- ============================================================
-- Credit every signed-in person at the fire for a completed pomodoro
-- ============================================================
-- complete_phase logged a completed focus phase for the initiator only.
-- Signed-in people who joined someone else's Bonfire and focused through
-- the whole phase never had it counted on their profile.
--
-- Now, when a focus phase completes, one pomodoro_logs row and one profile
-- increment go to each distinct signed-in user who is:
--   * the initiator (unchanged behaviour), or
--   * holding a seat at that moment: not left, heartbeat within 2 minutes
--     (the same liveness rule join_bonfire uses for taken seats).
-- Guest-only Bonfires still get their one bonfire-level log (user_id null).
--
-- Idempotency moves from (bonfire_id, pomodoro_number) to
-- (bonfire_id, pomodoro_number, user_id), NULLS NOT DISTINCT so the guest
-- row is still deduplicated. complete_phase already serialises on the
-- bonfire row lock and moves out of focus, so a phase is counted once.

DROP INDEX IF EXISTS public.idx_pomodoro_logs_bonfire_number;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pomodoro_logs_bonfire_number_user
  ON public.pomodoro_logs (bonfire_id, pomodoro_number, user_id) NULLS NOT DISTINCT
  WHERE bonfire_id IS NOT NULL;

-- Profile stats for one completed pomodoro. Internal: not callable by clients.
CREATE OR REPLACE FUNCTION public.credit_pomodoro(
  p_user_id uuid,
  p_minutes integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last_active date;
  v_today date := current_date;
BEGIN
  SELECT last_active_date INTO v_last_active
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_last_active = v_today - 1 THEN
    UPDATE public.profiles SET
      total_pomodoros     = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + p_minutes,
      current_streak      = current_streak + 1,
      longest_streak      = greatest(longest_streak, current_streak + 1),
      last_active_date    = v_today
    WHERE id = p_user_id;
  ELSIF v_last_active = v_today THEN
    UPDATE public.profiles SET
      total_pomodoros     = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + p_minutes
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles SET
      total_pomodoros     = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + p_minutes,
      current_streak      = 1,
      longest_streak      = greatest(longest_streak, 1),
      last_active_date    = v_today
    WHERE id = p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_pomodoro(uuid, integer) FROM PUBLIC, anon, authenticated;

-- ─── complete_phase ─────────────────────────────────────────
-- Same transitions as 20260924120000; only the crediting changes.
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
  v_user uuid;
  v_credited integer := 0;
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
    v_focus_minutes := least(greatest(v_bonfire.focus_duration / 60, 1), 180);

    FOR v_user IN
      SELECT v_bonfire.initiator_id WHERE v_bonfire.initiator_id IS NOT NULL
      UNION
      SELECT bp.user_id
      FROM public.bonfire_participants bp
      WHERE bp.bonfire_id = p_bonfire_id
        AND bp.user_id IS NOT NULL
        AND bp.left_at IS NULL
        AND bp.last_seen_at > now() - interval '2 minutes'
    LOOP
      INSERT INTO public.pomodoro_logs (bonfire_id, user_id, duration_minutes, pomodoro_number)
      VALUES (p_bonfire_id, v_user, v_focus_minutes, v_completed_pomodoros)
      ON CONFLICT (bonfire_id, pomodoro_number, user_id) WHERE bonfire_id IS NOT NULL DO NOTHING;

      IF FOUND THEN
        PERFORM public.credit_pomodoro(v_user, v_focus_minutes);
      END IF;
      v_credited := v_credited + 1;
    END LOOP;

    -- No one signed in: keep the one bonfire-level log, as before
    IF v_credited = 0 THEN
      INSERT INTO public.pomodoro_logs (bonfire_id, user_id, duration_minutes, pomodoro_number)
      VALUES (p_bonfire_id, NULL, v_focus_minutes, v_completed_pomodoros)
      ON CONFLICT (bonfire_id, pomodoro_number, user_id) WHERE bonfire_id IS NOT NULL DO NOTHING;
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

  RETURN v_result - 'initiator_token';
END;
$$;
