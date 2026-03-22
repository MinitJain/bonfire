-- Add jam_mode column to sessions (missing from initial schema)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS jam_mode boolean DEFAULT false;
