-- Add participant_count and participant_preview to sessions
-- participant_count: live headcount, updated by host heartbeat every 30s
-- participant_preview: first 3 participants { username, avatar_url }, for explore page cards
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS participant_count int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS participant_preview jsonb NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_sessions_participant_count ON public.sessions(participant_count);
