-- ============================================================
-- PomodoroJam — Initial Schema
-- ============================================================

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  total_pomodoros integer default 0,
  total_focus_minutes integer default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_active_date date,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Sessions
create table public.sessions (
  id text primary key,
  host_id uuid references public.profiles(id),
  host_name text not null,
  title text default 'Focus Session',
  status text default 'waiting',    -- waiting | active | ended
  mode text default 'focus',        -- focus | short | long
  time_left integer not null,
  total_time integer not null,
  running boolean default false,
  pomos_done integer default 0,
  settings jsonb default '{"focus":25,"short":5,"long":15,"rounds":4}',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.sessions enable row level security;
create policy "Sessions are viewable by everyone" on public.sessions for select using (true);
create policy "Host can update session" on public.sessions for update using (true);
create policy "Anyone can create session" on public.sessions for insert with check (true);

-- Enable realtime on sessions
alter publication supabase_realtime add table public.sessions;

-- Pomodoro log
create table public.pomodoro_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text references public.sessions(id) on delete set null,
  duration_minutes integer not null,
  completed_at timestamptz default now()
);

alter table public.pomodoro_logs enable row level security;
create policy "Users can insert own logs" on public.pomodoro_logs for insert with check (auth.uid() = user_id);
create policy "Users can view own logs" on public.pomodoro_logs for select using (auth.uid() = user_id);

-- Indexes
create index sessions_host_id_idx on public.sessions(host_id);
create index sessions_created_at_idx on public.sessions(created_at);
create index pomodoro_logs_user_id_idx on public.pomodoro_logs(user_id);
create index pomodoro_logs_completed_at_idx on public.pomodoro_logs(completed_at);

-- Auto-update updated_at for sessions
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sessions_updated_at
  before update on public.sessions
  for each row execute procedure public.update_updated_at_column();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Safely increment profile stats after a completed pomodoro
create or replace function public.increment_profile_stats(
  p_user_id uuid,
  p_minutes integer
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_last_active date;
  v_today date := current_date;
  v_new_streak integer;
begin
  select last_active_date into v_last_active from public.profiles where id = p_user_id;

  if v_last_active = v_today - interval '1 day' then
    -- Continuing streak
    update public.profiles
    set
      total_pomodoros    = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + p_minutes,
      current_streak     = current_streak + 1,
      longest_streak     = greatest(longest_streak, current_streak + 1),
      last_active_date   = v_today
    where id = p_user_id;
  elsif v_last_active = v_today then
    -- Same day, don't increment streak again
    update public.profiles
    set
      total_pomodoros    = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + p_minutes
    where id = p_user_id;
  else
    -- Streak broken or first time
    update public.profiles
    set
      total_pomodoros    = total_pomodoros + 1,
      total_focus_minutes = total_focus_minutes + p_minutes,
      current_streak     = 1,
      longest_streak     = greatest(longest_streak, 1),
      last_active_date   = v_today
    where id = p_user_id;
  end if;
end;
$$;
