# Bonfire

Bonfire is a temporary shared focus experience.

It is NOT a social network, productivity dashboard, or persistent room system.

## Product

Bonfire lets people gather around one shared virtual fire and focus together.

Core flow:

Home
→ Light a Bonfire / Join a Bonfire
→ shared Bonfire room
→ participants gather around the fire
→ shared timer
→ focus / short rest / long rest
→ leave

Account is optional.

Guests can create and join Bonfires.
Authenticated users get persistent identity and personal focus stats.

Maximum participants: 6.

A Bonfire may have an optional Bonfire name (for example "Deep Work"),
set only by its creator, max 40 characters. It is the only kind of title
a Bonfire has; do not add descriptions, tags, or other title fields.

## Modes

Focus Mode:

- initiator controls the shared timer

Jam Mode:

- legitimate participants can control the shared timer
- presence is NOT authorization

## Architecture

Bonfire v2 is server authoritative.

Client
→ PostgreSQL RPC command
→ PostgreSQL validates + transitions + persists
→ database-originated realtime publication
→ Edge Function
→ Supabase Realtime
→ clients

Clients NEVER broadcast canonical Bonfire state.

The timer is clock based.
There is no server-side per-second timer.

Read `docs/bonfire-v2-architecture.md` before making architectural changes.

## Product boundaries

Do NOT reintroduce:

- Explore
- followers/following
- social graph
- notifications system
- scheduled rooms
- shared streaks
- leaderboards
- gamification
- analytics dashboard
- activity feed
- public/private rooms
- host/watchers model
- testimonials
- social proof
- marketing feature sections

Spotify is deferred.

## Visual direction

Bonfire should feel like a small, calm shared game scene.

The fire is the visual center.

Participants appear as small stylized characters gathered around the fire,
with their names above them.

Participants must NOT look like a row of circular profile avatars.

The room should feel:

- calm
- warm
- elegant
- human
- minimal
- premium
- slightly playful

Visual environment:

- soft blue / pale blue atmosphere
- warm orange fire
- subtle blue/orange relationship

Avoid:

- generic SaaS dashboards
- excessive cards
- glassmorphism
- neon
- excessive purple
- giant glowing blobs
- emoji-based visuals
- noisy gradients
- over-designed UI

Home should feel like entering Bonfire, not a marketing website.

Approximate home composition:

BONFIRE

sit together. do your own work.

small illustrated objects distributed around the viewport

focus length (25 · 30 · 45 · 60 · custom) and rounds before the long rest

[ start a bonfire ] [ join a bonfire ]

Home only chooses focus length and rounds; rests follow the focus length.
Exact rests, mode and the Bonfire name stay in the room.

Use lightweight SVG/CSS illustrations for objects such as notebooks,
books, pencils, paper, mugs, headphones.

Animations should be subtle and purposeful.
Respect prefers-reduced-motion.

## Audio

Bonfire is silent by default.

- No ambient sound, tick, or phase-end chime plays until the participant
  explicitly enables it from the sound icon.
- The phase-end chime is a separate toggle, OFF by default.
- A previous sound choice may be remembered locally only as a suggestion.
  It must never autoplay on a later visit.
- Audio is local to each participant and never synchronized.

## Important workflow

Before changing code:

1. inspect the existing implementation
2. understand current architecture
3. identify reusable code
4. identify contradictions with the product spec
5. propose the smallest coherent implementation plan

Do not invent features.

Do not rewrite working backend architecture just to make a UI change.

For UI work, prioritize visual composition and interaction quality over
adding more components.

## Engineering

Stack:

- Next.js
- TypeScript
- React
- Supabase
- PostgreSQL
- Supabase Realtime

Important reusable infrastructure:

- lib/timer.ts
- lib/audio.ts
- lib/ambient.ts
- lib/favicon.ts
- useTimer.ts
- Supabase client/server utilities

Commands:

npm run typecheck
npm run lint
npm test
npm run build
