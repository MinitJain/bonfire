-- Drop the two older overloads of increment_profile_stats that were left behind
-- when each migration added a new parameter (Postgres treats different signatures
-- as separate functions rather than replacing the old one).
-- The 4-param version (p_user_id, p_minutes, p_session_id, p_today) from
-- migration 012 is the only one that should exist.

drop function if exists public.increment_profile_stats(uuid, integer);
drop function if exists public.increment_profile_stats(uuid, integer, text);
