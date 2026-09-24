-- ============================================================
-- Bonfire v2: bonfires table
-- ============================================================

create table public.bonfires (
  -- Identity
  id text primary key,                          -- 8-char alphanumeric
  join_code text unique not null,               -- 6-char short code

  -- Lifecycle
  status text not null default 'active'         -- 'active' | 'ended'
    check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),

  -- Timer state (authoritative clock)
  phase text not null default 'focus'           -- 'focus' | 'short' | 'long'
    check (phase in ('focus', 'short', 'long')),
  running boolean not null default false,
  started_at bigint,                            -- unix ms when current phase began
  time_left integer not null default 1800,      -- seconds remaining at last state change

  -- Configuration
  focus_duration integer not null default 1800, -- seconds (30 min)
  short_duration integer not null default 300,  -- seconds (5 min)
  long_duration integer not null default 900,   -- seconds (15 min)
  rounds_before_long integer not null default 4,
  session_mode text not null default 'focus'    -- 'focus' | 'jam'
    check (session_mode in ('focus', 'jam')),

  -- Session context
  initiator_id uuid references public.profiles(id) on delete set null,
  initiator_token text not null,                -- 128-bit random, for guest auth
  initiator_name text not null default 'Someone',
  current_round integer not null default 1,     -- which focus round (1-indexed)

  -- Analytics
  completed_pomodoros integer not null default 0,

  -- Metadata
  last_active_at timestamptz not null default now()
);

alter table public.bonfires enable row level security;

-- Anyone can read active bonfires (for join flow and session page)
create policy "bonfires_select_active" on public.bonfires
  for select using (status = 'active');

-- Only RPC functions write (SECURITY DEFINER handles authorization)
-- No INSERT/UPDATE/DELETE policies for clients

-- Indexes
create index idx_bonfires_join_code on public.bonfires (join_code);
create index idx_bonfires_status on public.bonfires (status);
create index idx_bonfires_last_active_at on public.bonfires (last_active_at);

-- Auto-update last_active_at on every UPDATE
create or replace function public.update_bonfire_timestamps()
returns trigger as $$
begin
  NEW.last_active_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger bonfires_timestamps
  before update on public.bonfires
  for each row execute function public.update_bonfire_timestamps();
