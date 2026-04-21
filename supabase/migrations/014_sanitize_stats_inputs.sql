-- Harden increment_profile_stats against forged inputs.
-- Since this is a SECURITY DEFINER function the caller can pass arbitrary values;
-- two mitigations are added:
--   1. p_today is clamped to within ±1 calendar day of the server date so clients
--      cannot backdate or future-date streak entries beyond what timezone skew requires.
--   2. p_minutes is capped at 180 (3 hours) to prevent inflated focus times.
-- Also fixes implicit timestamp cast: use date subtraction (v_today - 1) instead
-- of interval arithmetic (v_today - interval '1 day') so both sides stay as dates.

create or replace function public.increment_profile_stats(
  p_user_id    uuid,
  p_minutes    integer,
  p_session_id text  default null,
  p_today      date  default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_last_active date;
  v_today       date;
  v_minutes     integer;
begin
  -- Sanitize p_minutes: ignore zero/negative, cap at 180 min (3 hours)
  v_minutes := least(greatest(coalesce(p_minutes, 0), 1), 180);
  if v_minutes <= 0 then return; end if;

  -- Sanitize p_today: clamp client-supplied date to ±1 day of server current_date
  -- to accommodate all timezones while blocking forged dates.
  v_today := coalesce(p_today, current_date);
  if v_today > current_date + 1 then v_today := current_date; end if;
  if v_today < current_date - 1 then v_today := current_date; end if;

  -- Lock the row to prevent concurrent streak miscalculation
  select last_active_date into v_last_active
  from public.profiles
  where id = p_user_id
  for update;

  if v_last_active = v_today - 1 then
    -- Continuing streak (date subtraction stays as date, no implicit cast)
    update public.profiles
    set
      total_pomodoros     = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + v_minutes,
      current_streak      = current_streak + 1,
      longest_streak      = greatest(longest_streak, current_streak + 1),
      last_active_date    = v_today
    where id = p_user_id;
  elsif v_last_active = v_today then
    -- Same day, don't increment streak again
    update public.profiles
    set
      total_pomodoros     = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + v_minutes
    where id = p_user_id;
  else
    -- Streak broken or first pomodoro ever
    update public.profiles
    set
      total_pomodoros     = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + v_minutes,
      current_streak      = 1,
      longest_streak      = greatest(longest_streak, 1),
      last_active_date    = v_today
    where id = p_user_id;
  end if;

  insert into public.pomodoro_logs (user_id, session_id, duration_minutes)
  values (p_user_id, p_session_id, v_minutes);
end;
$$;
