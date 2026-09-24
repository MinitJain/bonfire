-- ============================================================
-- Bonfire v2: Add bonfire_id to pomodoro_logs
-- ============================================================
-- Allows pomodoro_logs to reference both v1 sessions and v2 bonfires.
-- session_id column remains for v1 compatibility.

alter table public.pomodoro_logs
  add column if not exists bonfire_id text;

create index if not exists idx_pomodoro_logs_bonfire_id
  on public.pomodoro_logs (bonfire_id);
