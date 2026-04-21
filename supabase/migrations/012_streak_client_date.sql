-- Pass the client's local date for streak calculation so UTC/local timezone
-- differences don't cause wrong-day attribution (e.g. 11pm EST = next day UTC).
-- p_today is optional and backward-compatible: omitting it falls back to server current_date.

create or replace function public.increment_profile_stats(
  p_user_id    uuid,
  p_minutes    integer,
  p_session_id text  default null,
  p_today      date  default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_last_active date;
  v_today       date := coalesce(p_today, current_date);
begin
  if p_minutes <= 0 then return; end if;

  -- Lock the row to prevent concurrent streak miscalculation
  select last_active_date into v_last_active
  from public.profiles
  where id = p_user_id
  for update;

  if v_last_active = v_today - interval '1 day' then
    -- Continuing streak
    update public.profiles
    set
      total_pomodoros     = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + p_minutes,
      current_streak      = current_streak + 1,
      longest_streak      = greatest(longest_streak, current_streak + 1),
      last_active_date    = v_today
    where id = p_user_id;
  elsif v_last_active = v_today then
    -- Same day, don't increment streak again
    update public.profiles
    set
      total_pomodoros     = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + p_minutes
    where id = p_user_id;
  else
    -- Streak broken or first pomodoro ever
    update public.profiles
    set
      total_pomodoros     = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + p_minutes,
      current_streak      = 1,
      longest_streak      = greatest(longest_streak, 1),
      last_active_date    = v_today
    where id = p_user_id;
  end if;

  -- Log every completed pomodoro for the analytics dashboard
  insert into public.pomodoro_logs (user_id, session_id, duration_minutes)
  values (p_user_id, p_session_id, p_minutes);
end;
$$;
