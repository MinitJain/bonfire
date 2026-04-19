# Bonfire

A real-time shared Pomodoro timer app built with Next.js 14.

## Stack
- Next.js 14 (App Router) + TypeScript (strict)
- Tailwind CSS with custom dark theme
- Supabase (Auth, Postgres, Realtime broadcast channels + Presence)
- @vercel/og for dynamic OG images
- Lucide React for icons
- Web Audio API + Notification API for alerts (no external deps)

## Dev Setup
1. Copy `.env.local.example` to `.env.local` and fill in Supabase credentials
2. Run Supabase migrations in `supabase/migrations/` in order (001–005), or `npx supabase db push`
3. `npm install && npm run dev`

## Architecture
- **Host** creates a session, controls the timer, broadcasts state via Supabase Realtime
- **Watchers** subscribe to the broadcast channel and receive timer updates
- Timer is clock-based (startedAt timestamp) so it's drift-resistant
- Sessions stored in Postgres; real-time sync via broadcast (ephemeral, not DB writes)
- Presence tracks participants; join/leave fire activity feed messages
- `pomodoro_logs` table stores per-session completed pomodoros for analytics

## Key Files
- `hooks/useTimer.ts` - Core timer logic
- `hooks/useSession.ts` - Realtime session sync (broadcast + presence)
- `components/session/SessionProvider.tsx` - Main session UI orchestrator
- `components/session/ActivityFeed.tsx` - Floating live activity messages
- `components/profile/WeeklyChart.tsx` - Last-7-days bar chart
- `components/profile/StreakCalendar.tsx` - GitHub-style 52×7 heatmap
- `app/session/[id]/page.tsx` - Session page (server + client)
- `app/profile/[username]/page.tsx` - Public profile + analytics
- `app/explore/page.tsx` - Browse live sessions
- `supabase/migrations/` - DB schema (run in order)

## Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint

## Writing Rules
- Never use em dashes (—) in any text: UI copy, READMEs, docs, commit messages, or any other written output. Use a colon, period, or plain hyphen (-) instead.
