# PomodoroJam

A real-time shared Pomodoro timer app built with Next.js 14.

## Stack
- Next.js 14 (App Router) + TypeScript (strict)
- Tailwind CSS with custom dark theme
- Supabase (Auth, Postgres, Realtime broadcast channels)
- @vercel/og for dynamic OG images
- Lucide React for icons
- Web Audio API + Notification API for alerts (no external deps)

## Dev Setup
1. Copy `.env.local.example` to `.env.local` and fill in Supabase credentials
2. Run Supabase migrations in `supabase/migrations/` in order
3. `npm install && npm run dev`

## Architecture
- **Host** creates a session, controls the timer, broadcasts state via Supabase Realtime
- **Watchers** subscribe to the broadcast channel and receive timer updates
- Timer is clock-based (startedAt timestamp) so it's drift-resistant
- Sessions stored in Postgres; real-time sync via broadcast (ephemeral, not DB writes)

## Key Files
- `hooks/useTimer.ts` - Core timer logic
- `hooks/useSession.ts` - Realtime session sync
- `components/session/SessionProvider.tsx` - Main session UI orchestrator
- `app/session/[id]/page.tsx` - Session page (server + client)
- `supabase/migrations/` - DB schema

## Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint
