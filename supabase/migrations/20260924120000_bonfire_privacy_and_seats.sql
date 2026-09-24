-- ============================================================
-- Bonfire v2: token privacy, readable ended bonfires,
-- server-assigned seats (max 6), 25 minute default focus
-- ============================================================
--
-- 1. initiator_token is never client-visible:
--    - column-level SELECT grant excludes it
--    - command RPCs return the row without it
--    - the relay payload (pg_net -> Edge Function -> Realtime) omits it
--    create_bonfire still returns it, to the creator only.
-- 2. Ended bonfires stay readable so /bonfire/[id] can render
--    "The fire has settled" when loaded directly.
-- 3. bonfire_participants becomes the seat registry. join_bonfire
--    assigns one of six seats and refuses a seventh participant.
--    Seats are held by a heartbeat and released on leave.
-- 4. Jam mode control requires a held seat (authenticated users
--    included). Presence alone is still never authorization.
-- 5. Default focus duration is 25 minutes.

-- ─── 1. Column-level read access (no initiator_token) ───────
REVOKE SELECT ON public.bonfires FROM anon, authenticated;
GRANT SELECT (
  id, join_code, status, created_at,
  phase, running, started_at, time_left,
  focus_duration, short_duration, long_duration, rounds_before_long,
  session_mode, initiator_id, initiator_name,
  current_round, completed_pomodoros, last_active_at
) ON public.bonfires TO anon, authenticated;

-- ─── 2. Ended bonfires are readable ─────────────────────────
DROP POLICY IF EXISTS "bonfires_select_active" ON public.bonfires;
CREATE POLICY "bonfires_select_all" ON public.bonfires
  FOR SELECT USING (true);

-- ─── 5. 25 minute default ───────────────────────────────────
ALTER TABLE public.bonfires
  ALTER COLUMN focus_duration SET DEFAULT 1500,
  ALTER COLUMN time_left SET DEFAULT 1500;

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

-- ─── 1b. Relay payload without initiator_token ──────────────
CREATE OR REPLACE FUNCTION public.bonfire_notify_edge()
RETURNS TRIGGER AS $$
DECLARE
  v_row jsonb;
  v_url text;
  v_key text;
BEGIN
  SELECT to_jsonb(b.*) - 'initiator_token' INTO v_row
  FROM public.bonfires b
  WHERE b.id = NEW.id;

  SELECT value INTO v_url FROM public.bonfire_relay_config WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM public.bonfire_relay_config WHERE key = 'supabase_anon_key';

  IF v_url IS NULL OR v_url = '' OR v_key IS NULL OR v_key = '' THEN
    RETURN NEW;
  END IF;

  v_url := v_url || '/functions/v1/bonfire-relay';

  BEGIN
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key,
        'apikey', v_key
      ),
      body := v_row
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'bonfire-relay notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Seat registry ───────────────────────────────────────
-- Seats: 0 top, 1 upper-left, 2 upper-right,
--        3 lower-left, 4 lower-right, 5 bottom
ALTER TABLE public.bonfire_participants
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seat smallint CHECK (seat BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS left_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bonfire_participants_user
  ON public.bonfire_participants (bonfire_id, user_id);

DROP FUNCTION IF EXISTS public.join_bonfire(text, text);

-- Claims (or reclaims) a seat. Returns the participant credential
-- and the seat index. A caller reclaims their previous row by
-- presenting its token, or by being the same authenticated user.
CREATE OR REPLACE FUNCTION public.join_bonfire(
  p_bonfire_id text,
  p_name text DEFAULT 'Guest',
  p_token text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status text;
  v_name text;
  v_row_id uuid;
  v_row_seat smallint;
  v_token text;
  v_taken smallint[];
  v_seat smallint;
  -- Seat preference: every prefix is a balanced arrangement
  -- (1: side, 2: both front sides, 3: triangle, 4: kite, ...)
  v_pref smallint[] := ARRAY[3, 4, 0, 5, 1, 2]::smallint[];
BEGIN
  -- Lock the bonfire row so concurrent joins are serialized.
  SELECT status INTO v_status FROM public.bonfires
  WHERE id = p_bonfire_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Bonfire not found'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'This bonfire has ended'; END IF;

  v_name := left(nullif(btrim(coalesce(p_name, '')), ''), 40);
  IF v_name IS NULL THEN v_name := 'Guest'; END IF;

  SELECT id, seat, participant_token INTO v_row_id, v_row_seat, v_token
  FROM public.bonfire_participants
  WHERE bonfire_id = p_bonfire_id
    AND (
      (p_token IS NOT NULL AND participant_token = p_token)
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    )
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT coalesce(array_agg(seat), '{}') INTO v_taken
  FROM public.bonfire_participants
  WHERE bonfire_id = p_bonfire_id
    AND seat IS NOT NULL
    AND left_at IS NULL
    AND last_seen_at > now() - interval '2 minutes'
    AND id IS DISTINCT FROM v_row_id;

  IF v_row_seat IS NOT NULL AND NOT (v_row_seat = ANY (v_taken)) THEN
    v_seat := v_row_seat;
  ELSE
    SELECT s INTO v_seat
    FROM unnest(v_pref) WITH ORDINALITY AS t(s, ord)
    WHERE NOT (s = ANY (v_taken))
    ORDER BY ord
    LIMIT 1;
  END IF;

  IF v_seat IS NULL THEN
    RAISE EXCEPTION 'This bonfire is full';
  END IF;

  IF v_row_id IS NOT NULL THEN
    UPDATE public.bonfire_participants SET
      name = v_name,
      user_id = coalesce(auth.uid(), user_id),
      seat = v_seat,
      last_seen_at = now(),
      left_at = NULL
    WHERE id = v_row_id;
  ELSE
    v_token := encode(extensions.gen_random_bytes(16), 'hex');
    INSERT INTO public.bonfire_participants
      (bonfire_id, participant_token, name, user_id, seat, last_seen_at)
    VALUES
      (p_bonfire_id, v_token, v_name, auth.uid(), v_seat, now());
  END IF;

  RETURN jsonb_build_object(
    'participant_token', v_token,
    'bonfire_id', p_bonfire_id,
    'seat', v_seat
  );
END;
$$;

-- Heartbeat. Returns false when the seat has lapsed or was released,
-- in which case the client calls join_bonfire again.
CREATE OR REPLACE FUNCTION public.touch_bonfire_seat(
  p_bonfire_id text,
  p_token text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bonfire_participants SET last_seen_at = now()
  WHERE bonfire_id = p_bonfire_id
    AND participant_token = p_token
    AND left_at IS NULL
    AND last_seen_at > now() - interval '2 minutes';
  RETURN FOUND;
END;
$$;

-- Step away: release the seat immediately.
CREATE OR REPLACE FUNCTION public.leave_bonfire(
  p_bonfire_id text,
  p_token text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bonfire_participants SET left_at = now()
  WHERE bonfire_id = p_bonfire_id
    AND participant_token = p_token
    AND left_at IS NULL;
END;
$$;

-- ─── 4. Jam control requires a held seat ────────────────────
CREATE OR REPLACE FUNCTION public.can_control_bonfire(
  p_bonfire record,
  p_token text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_bonfire_initiator(p_bonfire, p_token) THEN
    RETURN true;
  END IF;

  IF p_bonfire.session_mode <> 'jam' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.bonfire_participants bp
    WHERE bp.bonfire_id = p_bonfire.id
      AND bp.left_at IS NULL
      AND (
        (p_token IS NOT NULL AND bp.participant_token = p_token)
        OR (auth.uid() IS NOT NULL AND bp.user_id = auth.uid())
      )
  );
END;
$$;

-- ─── 1c. Command RPCs return the row without initiator_token ─
-- Bodies are unchanged from 023 (and 024 for complete_phase)
-- except for the final RETURN.

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

  RETURN v_result - 'initiator_token';
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

  RETURN v_result - 'initiator_token';
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

  RETURN v_result - 'initiator_token';
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

  RETURN v_result - 'initiator_token';
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

  RETURN v_result - 'initiator_token';
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

  RETURN v_result - 'initiator_token';
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

  RETURN v_result - 'initiator_token';
END;
$$;

-- ─── Grants ─────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.join_bonfire(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_bonfire_seat(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leave_bonfire(text, text) TO anon, authenticated;
