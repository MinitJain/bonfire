-- ============================================================
-- Bonfire v2: RPC functions (SECURITY DEFINER)
-- ============================================================
-- All commands go through these functions. Clients never write
-- directly to the bonfires table.

-- ─── Helpers ─────────────────────────────────────────────────

-- Generate 8-char alphanumeric ID
create or replace function public.generate_bonfire_id()
returns text language plpgsql as $$
declare
  chars text := 'abcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Generate 6-char short join code (no ambiguous chars)
create or replace function public.generate_join_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Generate cryptographically random hex token (32 hex chars = 128 bits)
create or replace function public.generate_initiator_token()
returns text language plpgsql as $$
begin
  return encode(gen_random_bytes(16), 'hex');
end;
$$;

-- ─── Authorization helper ────────────────────────────────────

-- Returns true if the caller is authorized to control this bonfire.
-- p_token is the client-provided initiator token (for guest auth).
create or replace function public.is_bonfire_initiator(
  p_bonfire record,
  p_token text default null
)
returns boolean language plpgsql as $$
begin
  -- Authenticated initiator
  if auth.uid() = p_bonfire.initiator_id then
    return true;
  end if;
  -- Guest initiator (token match)
  if p_token is not null and p_token = p_bonfire.initiator_token then
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.can_control_bonfire(
  p_bonfire record,
  p_token text default null
)
returns boolean language plpgsql as $$
begin
  -- Always allow if initiator
  if public.is_bonfire_initiator(p_bonfire, p_token) then
    return true;
  end if;
  -- Jam mode: any authenticated user
  if p_bonfire.session_mode = 'jam' and auth.uid() is not null then
    return true;
  end if;
  -- Jam mode: guest with valid participant token (same as initiator token for now)
  if p_bonfire.session_mode = 'jam' and p_token is not null and p_token = p_bonfire.initiator_token then
    return true;
  end if;
  return false;
end;
$$;

-- ─── create_bonfire ─────────────────────────────────────────

create or replace function public.create_bonfire(
  p_initiator_name text default 'Someone',
  p_focus_duration integer default 1800,
  p_short_duration integer default 300,
  p_long_duration integer default 900,
  p_rounds_before_long integer default 4,
  p_session_mode text default 'focus'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id text;
  v_join_code text;
  v_token text;
  v_bonfire jsonb;
begin
  -- Generate unique IDs (retry join_code on collision)
  v_id := public.generate_bonfire_id();
  v_token := public.generate_initiator_token();

  -- Ensure unique join_code
  loop
    v_join_code := public.generate_join_code();
    exit when not exists (select 1 from public.bonfires where join_code = v_join_code);
  end loop;

  insert into public.bonfires (
    id, join_code, initiator_id, initiator_token, initiator_name,
    focus_duration, short_duration, long_duration, rounds_before_long,
    session_mode, time_left
  ) values (
    v_id, v_join_code,
    auth.uid(),  -- null for guests
    v_token,
    p_initiator_name,
    p_focus_duration, p_short_duration, p_long_duration, p_rounds_before_long,
    p_session_mode,
    p_focus_duration  -- initial time_left = focus duration
  )
  returning to_jsonb(bonfires.*) into v_bonfire;

  return v_bonfire;
end;
$$;

-- ─── start_timer ─────────────────────────────────────────────

create or replace function public.start_timer(
  p_bonfire_id text,
  p_token text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bonfire record;
begin
  select * into v_bonfire from public.bonfires
  where id = p_bonfire_id for update;

  if not found then
    raise exception 'Bonfire not found';
  end if;

  if v_bonfire.status = 'ended' then
    raise exception 'Bonfire has ended';
  end if;

  if not public.can_control_bonfire(v_bonfire, p_token) then
    raise exception 'Not authorized';
  end if;

  if v_bonfire.running then
    raise exception 'Timer already running';
  end if;

  update public.bonfires set
    running = true,
    started_at = (extract(epoch from now()) * 1000)::bigint,
    last_active_at = now()
  where id = p_bonfire_id
  returning to_jsonb(bonfires.*) into v_bonfire;

  return to_jsonb(v_bonfire);
end;
$$;

-- ─── pause_timer ─────────────────────────────────────────────

create or replace function public.pause_timer(
  p_bonfire_id text,
  p_token text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bonfire record;
  v_elapsed integer;
  v_new_time_left integer;
begin
  select * into v_bonfire from public.bonfires
  where id = p_bonfire_id for update;

  if not found then
    raise exception 'Bonfire not found';
  end if;

  if v_bonfire.status = 'ended' then
    raise exception 'Bonfire has ended';
  end if;

  if not public.can_control_bonfire(v_bonfire, p_token) then
    raise exception 'Not authorized';
  end if;

  if not v_bonfire.running then
    raise exception 'Timer not running';
  end if;

  -- Compute elapsed time
  v_elapsed := greatest(0, floor((extract(epoch from now()) * 1000 - v_bonfire.started_at) / 1000))::integer;
  v_new_time_left := greatest(0, v_bonfire.time_left - v_elapsed);

  update public.bonfires set
    running = false,
    time_left = v_new_time_left,
    started_at = null,
    last_active_at = now()
  where id = p_bonfire_id
  returning to_jsonb(bonfires.*) into v_bonfire;

  return to_jsonb(v_bonfire);
end;
$$;

-- ─── skip_phase ──────────────────────────────────────────────

create or replace function public.skip_phase(
  p_bonfire_id text,
  p_token text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bonfire record;
  v_new_phase text;
  v_new_round integer;
  v_new_time_left integer;
begin
  select * into v_bonfire from public.bonfires
  where id = p_bonfire_id for update;

  if not found then
    raise exception 'Bonfire not found';
  end if;

  if v_bonfire.status = 'ended' then
    raise exception 'Bonfire has ended';
  end if;

  if not public.can_control_bonfire(v_bonfire, p_token) then
    raise exception 'Not authorized';
  end if;

  -- Determine next phase without completing current
  if v_bonfire.phase = 'focus' then
    if v_bonfire.current_round % v_bonfire.rounds_before_long = 0 then
      v_new_phase := 'long';
      v_new_time_left := v_bonfire.long_duration;
    else
      v_new_phase := 'short';
      v_new_time_left := v_bonfire.short_duration;
    end if;
    v_new_round := v_bonfire.current_round;
  else
    -- Break -> focus, advance round
    v_new_phase := 'focus';
    v_new_time_left := v_bonfire.focus_duration;
    v_new_round := v_bonfire.current_round + 1;
  end if;

  update public.bonfires set
    phase = v_new_phase,
    running = false,
    time_left = v_new_time_left,
    started_at = null,
    current_round = v_new_round,
    last_active_at = now()
  where id = p_bonfire_id
  returning to_jsonb(bonfires.*) into v_bonfire;

  return to_jsonb(v_bonfire);
end;
$$;

-- ─── complete_phase ──────────────────────────────────────────

create or replace function public.complete_phase(
  p_bonfire_id text,
  p_token text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bonfire record;
  v_elapsed integer;
  v_new_phase text;
  v_new_round integer;
  v_new_time_left integer;
  v_completed_pomodoros integer;
begin
  select * into v_bonfire from public.bonfires
  where id = p_bonfire_id for update;

  if not found then
    raise exception 'Bonfire not found';
  end if;

  if v_bonfire.status = 'ended' then
    raise exception 'Bonfire has ended';
  end if;

  if not v_bonfire.running then
    raise exception 'Timer not running';
  end if;

  -- Validate that timer has actually expired
  v_elapsed := greatest(0, floor((extract(epoch from now()) * 1000 - v_bonfire.started_at) / 1000))::integer;
  if v_bonfire.time_left - v_elapsed > 0 then
    raise exception 'Timer has not expired yet';
  end if;

  v_completed_pomodoros := v_bonfire.completed_pomodoros;

  -- Phase transition
  if v_bonfire.phase = 'focus' then
    -- Focus completed: count pomodoro, determine break
    v_completed_pomodoros := v_completed_pomodoros + 1;

    if v_bonfire.current_round % v_bonfire.rounds_before_long = 0 then
      v_new_phase := 'long';
      v_new_time_left := v_bonfire.long_duration;
    else
      v_new_phase := 'short';
      v_new_time_left := v_bonfire.short_duration;
    end if;
    v_new_round := v_bonfire.current_round;
  else
    -- Break completed: back to focus
    v_new_phase := 'focus';
    v_new_time_left := v_bonfire.focus_duration;
    v_new_round := v_bonfire.current_round + 1;
  end if;

  update public.bonfires set
    phase = v_new_phase,
    running = false,
    time_left = v_new_time_left,
    started_at = null,
    current_round = v_new_round,
    completed_pomodoros = v_completed_pomodoros,
    last_active_at = now()
  where id = p_bonfire_id
  returning to_jsonb(bonfires.*) into v_bonfire;

  return to_jsonb(v_bonfire);
end;
$$;

-- ─── change_settings ─────────────────────────────────────────

create or replace function public.change_settings(
  p_bonfire_id text,
  p_token text default null,
  p_focus_duration integer default null,
  p_short_duration integer default null,
  p_long_duration integer default null,
  p_rounds_before_long integer default null,
  p_session_mode text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bonfire record;
  v_elapsed integer;
  v_new_time_left integer;
begin
  select * into v_bonfire from public.bonfires
  where id = p_bonfire_id for update;

  if not found then
    raise exception 'Bonfire not found';
  end if;

  if v_bonfire.status = 'ended' then
    raise exception 'Bonfire has ended';
  end if;

  if not public.can_control_bonfire(v_bonfire, p_token) then
    raise exception 'Not authorized';
  end if;

  -- Update config fields (only non-null values)
  update public.bonfires set
    focus_duration = coalesce(p_focus_duration, focus_duration),
    short_duration = coalesce(p_short_duration, short_duration),
    long_duration = coalesce(p_long_duration, long_duration),
    rounds_before_long = coalesce(p_rounds_before_long, rounds_before_long),
    session_mode = coalesce(p_session_mode, session_mode),
    last_active_at = now()
  where id = p_bonfire_id
  returning to_jsonb(bonfires.*) into v_bonfire;

  -- If timer was running, pause it and reset with new durations
  if v_bonfire.running then
    v_elapsed := greatest(0, floor((extract(epoch from now()) * 1000 - v_bonfire.started_at) / 1000))::integer;
    v_new_time_left := greatest(0, v_bonfire.time_left - v_elapsed);

    update public.bonfires set
      running = false,
      time_left = case
        when v_bonfire.phase = 'focus' then coalesce(p_focus_duration, focus_duration)
        when v_bonfire.phase = 'short' then coalesce(p_short_duration, short_duration)
        else coalesce(p_long_duration, long_duration)
      end,
      started_at = null,
      last_active_at = now()
    where id = p_bonfire_id
    returning to_jsonb(bonfires.*) into v_bonfire;
  end if;

  return to_jsonb(v_bonfire);
end;
$$;

-- ─── toggle_mode ─────────────────────────────────────────────

create or replace function public.toggle_mode(
  p_bonfire_id text,
  p_token text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bonfire record;
  v_new_mode text;
begin
  select * into v_bonfire from public.bonfires
  where id = p_bonfire_id for update;

  if not found then
    raise exception 'Bonfire not found';
  end if;

  if v_bonfire.status = 'ended' then
    raise exception 'Bonfire has ended';
  end if;

  if not public.is_bonfire_initiator(v_bonfire, p_token) then
    raise exception 'Only the initiator can toggle mode';
  end if;

  v_new_mode := case when v_bonfire.session_mode = 'focus' then 'jam' else 'focus' end;

  update public.bonfires set
    session_mode = v_new_mode,
    last_active_at = now()
  where id = p_bonfire_id
  returning to_jsonb(bonfires.*) into v_bonfire;

  return to_jsonb(v_bonfire);
end;
$$;

-- ─── end_bonfire ─────────────────────────────────────────────

create or replace function public.end_bonfire(
  p_bonfire_id text,
  p_token text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bonfire record;
begin
  select * into v_bonfire from public.bonfires
  where id = p_bonfire_id for update;

  if not found then
    raise exception 'Bonfire not found';
  end if;

  if v_bonfire.status = 'ended' then
    raise exception 'Bonfire already ended';
  end if;

  if not public.is_bonfire_initiator(v_bonfire, p_token) then
    raise exception 'Only the initiator can end the bonfire';
  end if;

  update public.bonfires set
    status = 'ended',
    running = false,
    last_active_at = now()
  where id = p_bonfire_id
  returning to_jsonb(bonfires.*) into v_bonfire;

  return to_jsonb(v_bonfire);
end;
$$;

-- ─── resolve_join_code ───────────────────────────────────────

create or replace function public.resolve_join_code(
  p_code text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bonfire record;
begin
  select id, status into v_bonfire
  from public.bonfires
  where upper(join_code) = upper(p_code);

  if not found then
    raise exception 'Invalid join code';
  end if;

  if v_bonfire.status = 'ended' then
    raise exception 'This bonfire has ended';
  end if;

  return jsonb_build_object('id', v_bonfire.id);
end;
$$;
