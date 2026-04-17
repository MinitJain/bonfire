# PomodoroJam — Product Roadmap

> Vision: Transform PomodoroJam from a shared timer into a focus social network —
> where sessions become rooms, productivity becomes identity, and your streak with
> a friend is worth sharing.
>
> Strategy: One feature per day, committed daily. Ship small, ship often.

---

## What Already Exists (Do Not Rebuild)

| Feature | Location |
|---------|----------|
| Profile page (username, bio, avatar) | `app/profile/[username]/page.tsx` |
| Edit profile modal | `components/profile/EditProfileModal.tsx` |
| pomodoro_logs table (every session logged) | `supabase/migrations/005_log_pomodoros.sql` |
| OG image generation (@vercel/og) | `app/api/og/route.tsx` |
| Session title field in DB | `sessions.title` column |
| session_mode (host / jam / solo=private) | `supabase/migrations/006_session_mode.sql` |
| Avatar component | `components/ui/Avatar.tsx` |
| Share button on profile (copies OG URL) | `components/profile/ProfileCard.tsx` |
| Streak + pomodoro stats on profile | `components/profile/StatsGrid.tsx` |
| Weekly chart + heatmap calendar | `components/profile/WeeklyChart.tsx`, `StreakCalendar.tsx` |
| Ambient sounds (Web Audio API) | `components/session/AmbientPlayer` |
| Tab title updates with live timer | `components/session/SessionProvider.tsx` |

---

## Phase 1 — Rooms + Foundation Polish
> Make what exists feel intentional before adding anything new.

### 1a. Sessions → Rooms (UI rename + default names)
- [ ] Rename every "session" label in the UI to "room"
- [ ] Default room name generated on creation (e.g. "Minitjain's Room") — user can customize
- [ ] Room name shown prominently in: explore page, session header, share card, browser tab
- [ ] Files to touch: `app/api/session/route.ts`, `components/session/SessionProvider.tsx`, `app/explore/page.tsx`, `components/landing/LandingClient.tsx`

### 1b. Public / Private toggle
- [ ] Public = shows on explore; Private = invite link only (replaces solo mode for privacy)
- [ ] DB migration: `ALTER TABLE sessions ADD COLUMN is_public boolean DEFAULT true`
- [ ] Toggle shown on room creation and in room settings
- [ ] Skip max participants — not needed yet

### 1c. Avatar upload
- [ ] Create Supabase Storage bucket: `avatars` (public read, authenticated write)
- [ ] Add photo picker + upload to `EditProfileModal`
- [ ] Show upload progress, error state, and preview before saving
- [ ] On save: upload file → get public URL → update `profiles.avatar_url`
- [ ] Avatar renders across: profile page, session participant list, explore page

### 1d. Session tags — what are you working on?
- [ ] Tag picker on room creation: DSA, System Design, Coding, Reading, Writing, Study, Work, Other
- [ ] Tags stored in `sessions.settings` jsonb (no new column needed)
- [ ] Tag shown on explore page card and session header
- [ ] Tags feed into analytics — break down pomodoros by category on profile
- [ ] Makes the duo card richer: "You and @friend spent 3 hours on DSA together"

### 1e. Daily focus goal
- [ ] User sets a daily goal: X pomodoros per day (stored in `profiles.settings` jsonb)
- [ ] Progress ring visible on the session screen — "3 of 6 today"
- [ ] Progress shown on profile page alongside streak
- [ ] Goal resets at midnight, contributes to streak if met

### 1f. Pomodoro counter + long break logic
- [ ] Visual dot indicator on timer: `● ● ● ○` showing current pomodoro in cycle (default 4)
- [ ] Auto-trigger long break (default 15 min) after N pomodoros — standard Pomodoro technique
- [ ] Cycle count shown in session header and recap screen
- [ ] Synced across host + all watchers via broadcast

### 1g. Custom timer presets
- [ ] Preset picker on room creation: Classic (25/5), Deep Work (50/10), Sprint (90/20), Custom
- [ ] Custom lets host set focus/short-break/long-break durations and cycle length
- [ ] Preset shown on explore card and session header
- [ ] Stored in `sessions.settings` jsonb (no new column needed)

### 1h. Invite system
- [ ] Host can invite specific users by username — sends in-app notification: "@host invited you to their room"
- [ ] Room invite link includes preview: room name, tag, who's in it, timer state, participant count
- [ ] "Pending invites" badge in header; inbox at `/invites`
- [ ] DB: `room_invites (id, room_id, inviter_id, invitee_id, status, created_at)` — status: pending/accepted/declined
- [ ] RLS: invitee can read/update their own invites; inviter can read invites they sent

### 1i. Task list in session
- [ ] Before starting, host sets 1–5 tasks: "What are you working on?"
- [ ] Tasks shown as checklist on the session screen for all participants
- [ ] Check off tasks mid-session; completed tasks visible in recap
- [ ] Stored in `sessions.settings` jsonb; updates broadcast to watchers in real-time
- [ ] Feeds session recap screen: "Completed 3 of 4 tasks"

---

## Phase 2 — Social Graph
> Unlocks all engagement features. Build after Phase 1 is solid.

### 2a. User search / discovery
- [ ] Search bar at `/explore` and in the header: search by username or display name
- [ ] Results show: avatar, username, follower count, current streak, "Follow" button
- [ ] Server-side query: `profiles WHERE username ILIKE '%query%' OR display_name ILIKE '%query%'`
- [ ] Debounced input (300ms) — no search button needed
- [ ] Empty state: "No users found. Invite a friend instead → [copy link]"
- [ ] This must ship before follow/unfollow — a social graph with no discovery is useless

### 2b. Follow / Unfollow
- [ ] New table: `followers (follower_id uuid, following_id uuid, created_at timestamptz, PRIMARY KEY (follower_id, following_id))`
- [ ] RLS: anyone can read follows, only you can insert/delete your own
- [ ] Follow / Unfollow button on any profile you don't own
- [ ] Follower count + Following count shown on profile card
- [ ] Following list page: `/profile/[username]/following`
- [ ] Followers list page: `/profile/[username]/followers`

### 2c. Live status on profiles
- [ ] If a user is in a public room right now → show "🔴 Live" badge on their profile
- [ ] Clicking it shows: room name + tag + participant count + "Join room" button
- [ ] Implementation: query `sessions` where `host_id = profile.id AND running = true AND is_public = true AND last_active_at > 90s ago`
- [ ] Profile page revalidates every 30s

### 2d. Friends' rooms on Explore
- [ ] Explore page gets two tabs: "Friends" and "Everyone"
- [ ] Friends tab: rooms where at least one person you follow is currently active
- [ ] Everyone tab: current explore behavior (all public rooms)
- [ ] Requires auth to see Friends tab — guests see Everyone only

### 2e. "Friend started a room" notification banner
- [ ] When someone you follow starts a public room → in-app banner appears: "@friend just started a room — join them?"
- [ ] Banner auto-dismisses after 8s, click goes directly to the room
- [ ] Implementation: Supabase Realtime subscription on `sessions` INSERT where `host_id IN (following list)`
- [ ] This is the pull mechanic Forest literally cannot build — our biggest weapon

### 2f. Session recap screen
- [ ] After a focus session ends: full-screen recap overlay
- [ ] Shows: total time focused, pomodoros completed, logs added, who was in the room, tag, tasks completed
- [ ] One-tap share via Web Share API
- [ ] "See you tomorrow" with current streak shown — reinforces daily habit
- [ ] **Guest conversion nudge**: if user is not signed in, show "Save your streak — create an account" as the primary CTA on this screen. Highest-intent moment in the entire app — never waste it.

### 2g. Room reactions
- [ ] Emoji reaction bar on session screen: 🔥 💪 😤 ☕ — one tap, no typing
- [ ] Reactions float up and disappear (CSS animation) — visible to all participants via broadcast
- [ ] Doesn't interrupt focus; no chat, no replies — reactions only
- [ ] Rate-limited: max 1 reaction per user per 10s

### 2h. Accountability buddy mode
- [ ] Pair with one specific user: mutual opt-in, both must accept
- [ ] If either misses a focus day → the other gets an in-app nudge: "@friend hasn't focused today — send them a push?"
- [ ] Shared streak shown on both profiles: "14-day streak with @friend"
- [ ] DB: `accountability_pairs (user_a uuid, user_b uuid, created_at, PRIMARY KEY (user_a, user_b))`
- [ ] Max 1 buddy per user to keep it meaningful

---

## Phase 2.5 — Integrations
> Distribution channels and personality signals. Discord alone is worth a phase.

### 2.5a. Discord OAuth login
- [ ] Add Discord as a Supabase auth provider (OAuth 2.0)
- [ ] On first Discord login: pre-fill display name + avatar from Discord profile
- [ ] Show Discord icon on profile if connected
- [ ] Link existing account to Discord in profile settings

### 2.5b. Discord Rich Presence
- [ ] When user is in an active room → broadcast to Discord: "Focusing · Deep Work · 18:34 remaining"
- [ ] Room name + tag shown as activity details; participant count as state
- [ ] Implementation: Discord Game SDK / `discord-rpc` via a lightweight Electron wrapper or browser extension
- [ ] Passive distribution — every Discord user who sees it is a potential new user
- [ ] Opt-in toggle in profile settings (default ON for Discord-connected users)

### 2.5c. Discord bot
- [ ] `/start-room` — creates a room and posts the invite link in the channel
- [ ] `/focus-status` — shows who from the server is currently in a room
- [ ] Scheduled room reminder: bot posts "Room starting in 10 minutes — join @host" in a configured channel
- [ ] Invite via: `discord.com/api/oauth2/authorize` with bot scope

### 2.5d. Spotify now playing
- [ ] Spotify OAuth in profile settings (scopes: `user-read-currently-playing`, `user-read-playback-state`)
- [ ] If connected + in a room: show track name + artist + album art in a small pill on the session screen
- [ ] Other participants see your "now playing" in real-time (broadcast via presence metadata)
- [ ] "Top tracks during focus" section on profile: most played songs/artists during logged sessions
- [ ] Opt-in; can hide per-session

### 2.5e. Apple Music + Last.fm
- [ ] Apple Music: MusicKit JS — same display as Spotify, no OAuth needed on supported browsers
- [ ] Last.fm: scrobble completed pomodoro sessions as listening sessions; show "scrobbled X tracks this session"
- [ ] Both shown as optional connections in profile settings alongside Spotify

### 2.5f. PWA — installable app
- [ ] `manifest.json`: name, icons (192/512), theme color, `display: standalone`, `start_url`
- [ ] Service worker: cache shell + static assets; timer keeps running offline (already clock-based)
- [ ] "Add to Home Screen" install prompt triggered after first completed pomodoro
- [ ] Push notifications via Web Push API (replaces Notification API for installed users)
- [ ] iOS Safari: `apple-touch-icon` + `apple-mobile-web-app-capable` meta tags

---

## Phase 3 — Gamification + Shared Stats
> The viral, sticky layer. Build after Phase 2 is solid.

### 3a. Shared focus stats between two users
- [ ] Query: pomodoro_logs where both user A and user B have entries for the same session_id
- [ ] Surface on profiles: "You and @friend have focused together X times — Y minutes total"
- [ ] Tag breakdown: "3 hours on DSA, 2 hours on System Design"
- [ ] Only show this section when viewing someone else's profile (not your own)
- [ ] Shared streak: consecutive days both users completed at least one room together

### 3b. Solo shareable card (extends existing /api/og)
- [ ] New card variant: `type=stats` — total pomodoros, streak, focus hours, heatmap preview
- [ ] One-tap share via Web Share API (navigator.share) → Instagram Stories, WhatsApp, iMessage
- [ ] Fallback: copy image URL to clipboard (already partially built in ProfileCard)
- [ ] Files: `app/api/og/route.tsx` (add stats variant), `components/profile/ProfileCard.tsx`

### 3c. Duo shareable card
- [ ] New OG variant: `type=duo` — both avatars flanking a bonfire, "50 rooms together, 1,247 minutes"
- [ ] Shared streak + shared log count displayed
- [ ] Only generates if both users have at least 1 shared session
- [ ] Share button appears on the "shared stats" section of the profile
- [ ] This is the screenshot people send to friends — the viral hook

### 3d. Milestone toasts in-session
- [ ] When a room completes, check if host + any participant hit a milestone together
- [ ] Milestones: 5, 10, 25, 50, 100 rooms together
- [ ] Show a celebration toast inside the session: "You and @friend just hit 50 rooms together!"
- [ ] Milestone data stored in: query on the fly from pomodoro_logs (no new table needed)

---

## Phase 4 — The Bonfire (Visual Soul)
> Our answer to Forest's growing tree — but inherently multiplayer.
> A fire gets bigger when people gather around it. No explanation needed.
>
> **Build order note:** 4a–4d move to Days 11–14 (right after Phase 1) — they only need existing timer state and presence. 4e (ashes screen) is built alongside the session recap screen (Day 23) since users need an exit state. 4f (duo card) stays in Phase 3 alongside shared stats.

### 4a. Bonfire on the session screen
- [ ] Three.js WebGL particle system — CSS fire looks predictable, Three.js fire breathes
- [ ] Dynamic import only on session page: `dynamic(() => import('@/components/session/BonfireScene'), { ssr: false })` — landing page unaffected
- [ ] Two particle tiers: desktop 400+ particles (embers + smoke), mobile 150 particles (no smoke)
- [ ] Point light from the fire that softly illuminates the session UI around it
- [ ] Flame states tied to session:
  - Session starts → small flame ignites from nothing
  - Focus timer running → flames grow steadily
  - Pomodoro completed → log added, flames surge briefly then settle
  - Break time → flames calm to a gentle glow
  - Timer paused → flames shrink slowly
  - Session abandoned mid-focus → fire dies → ashes

### 4b. Logs as pomodoro completions
- [ ] Each completed pomodoro = one wooden log added to the 3D pile
- [ ] Logs are physically countable — pile grows visibly over the session
- [ ] Log count shown in session header: "4 logs"
- [ ] Uses `pomodoro_logs` table (already exists — no new table needed)

### 4c. Shared bonfire in rooms
- [ ] Everyone feeds the same fire — one bonfire, not one per person
- [ ] Flame height scales with active participant count
- [ ] When someone joins → fire visibly grows; when someone leaves → flame dips
- [ ] Shared fire is the social metaphor built into the mechanic

### 4d. Tab-switch accountability
- [ ] Page Visibility API: when tab loses focus mid-focus-timer, fire starts shrinking
- [ ] Come back within 30s → fire recovers fully
- [ ] Stay away → fire shrinks to embers, then ashes
- [ ] This is the "skin in the game" mechanic — abandoning the tab has a consequence
- [ ] In shared rooms: only affects your personal contribution, not the whole fire

### 4e. Ashes state
- [ ] Fire dies → particles physics-settle into ash pile on the ground
- [ ] Ashes screen shown to all participants when host abandons mid-session
- [ ] Must feel bad enough to see that users avoid it (same psychological weight as Forest's dead tree)

### 4f. Bonfire on the duo shareable card
- [ ] Both avatars flanking a rendered bonfire snapshot
- [ ] "50 sessions together — 1,247 minutes. 237 logs added."
- [ ] Bonfire size reflects total shared sessions (bigger fire = more history together)

---

## Phase 5 — Retention + Onboarding
> Makes the app sticky for new users who have zero friends on it yet.

### 5a. Onboarding flow
- [ ] First-time visitor sees a 3-step onboarding: what is PomodoroJam, how rooms work, the bonfire mechanic
- [ ] "Aha moment" designed in: show a live room with the fire burning before they even sign up
- [ ] Skip-friendly — should never feel forced
- [ ] After sign-up: prompt to follow 1-2 suggested users (seeded accounts that are always "active")

### 5b. Cold start fallback — global community feel
- [ ] When user has 0 follows, show "X people are focusing right now worldwide" on the session screen
- [ ] Small subtle bonfire silhouettes in the background on explore when there are no rooms (instead of empty state text)
- [ ] "No friends yet? Start a room and share the link" CTA instead of dead empty state

### 5c. Scheduled rooms
- [ ] Host can schedule a room for a future time: "Study session tonight at 9pm"
- [ ] Room appears on explore with a countdown: "Starts in 2h 14m — 3 committed"
- [ ] Follow users get a banner notification when a scheduled room they committed to is about to start
- [ ] DB: `sessions.scheduled_at timestamptz`, `sessions.committed_user_ids uuid[]`

### 5d. Streak surfaced prominently
- [ ] Current streak shown on the session screen itself (not just profile) — small badge
- [ ] "Day 7 streak — don't break it" shown at session end recap
- [ ] At-risk warning: if user hasn't focused today and it's past 8pm — banner on landing page

---

## Phase 6 — Reliability + Infrastructure
> Not glamorous. Absolutely necessary before any real user growth.

### 6a. Offline / Realtime error state on session screen
- [ ] Detect Supabase Realtime disconnect mid-session
- [ ] Show a non-intrusive "Reconnecting..." banner — timer keeps running locally (clock-based, so it still works)
- [ ] On reconnect: re-sync state silently, dismiss banner
- [ ] On failure after 15s: show "Connection lost — your timer is still running locally" — don't freeze the UI

### 6b. Room history
- [ ] "Recent rooms" section on the profile page — last 10 rooms the user was in
- [ ] Shows: room name, tag, date, duration, who else was there
- [ ] Query from `pomodoro_logs` joined with `sessions` — no new table needed
- [ ] Links back to the room (even if it's ended, show a read-only recap)

### 6c. Weekly stats email digest
- [ ] Every Monday morning: "Your focus week in review"
- [ ] Contents: total pomodoros, focus hours, streak status, tag breakdown, one friend's stats
- [ ] "This week: 14 pomodoros. @friend did 22. Don't let them pull ahead."
- [ ] Implementation: Supabase Edge Function on a cron schedule + Resend (free tier covers this)
- [ ] Opt-out in profile settings — default ON for signed-in users
- [ ] This is the retention touchpoint Forest doesn't have. Weekly email = weekly re-engagement.

### 6d. Mobile layout audit
- [ ] Full audit of session screen on 375px (iPhone SE) and 390px (iPhone 14)
- [ ] Bonfire + timer + controls must all fit without scrolling
- [ ] Participant list collapses gracefully at small sizes
- [ ] Touch targets minimum 44px (Apple HIG)
- [ ] Do this before Phase 4 ships, not after

---

## What NOT to Build (Scope Boundaries)

| Feature | Why not |
|---------|---------|
| Direct messaging | Different product. Adds moderation burden. |
| Leaderboards | Needs critical mass first. Adds pressure, not joy. |
| Push notifications (mobile) | Complex infra. Save for when there's a native app. |
| Paid tiers / subscriptions | Premature. Build the social graph first. |
| AI focus suggestions | Feature creep. The product is the people, not the AI. |
| Max participants cap | Not needed at current scale. Revisit at 1k DAU. |
| Coin/reward economy | Too complex. Logs are the reward — they're visible and real. |

---

## Database Migration Plan

```sql
-- Phase 1a/1b
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Phase 1d (tags stored in existing settings jsonb — no migration needed)

-- Phase 1e (daily goal stored in profiles.settings jsonb — no migration needed)

-- Phase 2a
CREATE TABLE public.followers (
  follower_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view follows"    ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users manage own follows"   ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follows"   ON public.followers FOR DELETE USING (auth.uid() = follower_id);

CREATE INDEX idx_followers_follower   ON public.followers(follower_id);
CREATE INDEX idx_followers_following  ON public.followers(following_id);

-- Phase 1h (invite system)
CREATE TABLE public.room_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  inviter_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invitee reads own invites"   ON public.room_invites FOR SELECT USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);
CREATE POLICY "Inviter creates invites"     ON public.room_invites FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Invitee updates status"      ON public.room_invites FOR UPDATE USING (auth.uid() = invitee_id);

-- Phase 2h (accountability buddy)
CREATE TABLE public.accountability_pairs (
  user_a      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);
ALTER TABLE public.accountability_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own pairs" ON public.accountability_pairs FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Users create pairs"   ON public.accountability_pairs FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Users delete pairs"   ON public.accountability_pairs FOR DELETE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Phase 5c
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS committed_user_ids uuid[] DEFAULT '{}';

-- Supabase Storage (run in dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- CREATE POLICY "Public avatar read"  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Auth avatar upload"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
-- CREATE POLICY "Auth avatar update"  ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## The One Thing That Will Make or Break This

**The bonfire duo shareable card.**

Two avatars flanking a roaring fire. "50 sessions together — 1,247 minutes. 237 logs added."
One tap to share to Instagram Stories, WhatsApp, or iMessage.

That is the screenshot people send to friends. That is the viral loop.
Forest has a tree. We have a fire you build together — and that's a better story.

Everything else is infrastructure. The bonfire card is the hook.

---

## Build Order (one per day)

```
── Phase 1 — Rooms + Foundation ──────────────────────────────────────────────
Day 1.  Room rename — UI only, no DB
Day 2.  Default room names + name customization on creation
Day 3.  Public/Private toggle (DB migration + UI)
Day 4.  Pomodoro counter + long break logic (dot indicator, auto long break)
Day 5.  Custom timer presets (Classic / Deep Work / Sprint / Custom picker)
Day 6.  Session tags (tag picker on creation, shown on explore)
Day 7.  Task list in session (pre-session task entry, live checklist, recap)
Day 8.  Daily focus goal (profile settings + progress ring on session screen)
Day 9.  Avatar upload (Supabase Storage + EditProfileModal)
Day 10. Invite system (DB + in-app notifications + invite link preview)

── Phase 1.5 — Bonfire (core visual) ─────────────────────────────────────────
Day 11. Bonfire — Three.js setup + particle flame + all flame states
Day 12. Bonfire — log pile (3D mesh, grows per pomodoro)
Day 13. Bonfire — shared fire (scales with participant count)
Day 14. Bonfire — tab-switch accountability (Page Visibility API)

── Phase 2 — Social Graph ────────────────────────────────────────────────────
Day 15. User search (username/display name, shown on explore + header)
Day 16. Follow/Unfollow (DB + profile buttons + counts)
Day 17. Following/Followers list pages
Day 18. Live status badge on profiles
Day 19. Friends tab on Explore
Day 20. "Friend started a room" in-app notification banner
Day 21. Room reactions (emoji floats, rate-limited, broadcast)
Day 22. Accountability buddy mode (DB + nudges + shared streak)
Day 23. Session recap screen + bonfire ashes state (4e) + guest conversion nudge
Day 24. Offline / Realtime error state on session screen
Day 25. Room history on profile page

── Phase 2.5 — Integrations ──────────────────────────────────────────────────
Day 26. Discord OAuth login (Supabase provider + profile link)
Day 27. Spotify now playing (OAuth + real-time broadcast + top tracks on profile)
Day 28. Apple Music + Last.fm connections
Day 29. Discord Rich Presence (opt-in, room state broadcast to Discord)
Day 30. PWA — manifest + service worker + install prompt + Web Push
Day 31. Discord bot (/start-room, /focus-status, scheduled room reminders)

── Phase 3 — Gamification + Shared Stats ─────────────────────────────────────
Day 32. Shared focus stats query + profile section
Day 33. Shared streak between two users
Day 34. Streak surfaced on session screen + at-risk warning
Day 35. Cold start / global feel ("X focusing now" on session screen)
Day 36. Solo shareable card (Web Share API + OG variant)
Day 37. Milestone toasts in-session
Day 38. Duo shareable card with bonfire (4f)

── Phase 5 — Retention + Onboarding ─────────────────────────────────────────
Day 39. Onboarding flow (3-step, skip-friendly)
Day 40. Scheduled rooms (DB + explore card + commit button)
Day 41. Weekly stats email digest (Supabase Edge Function + Resend)

── Phase 6 — Reliability + Polish ───────────────────────────────────────────
Day 42. Mobile layout audit + fixes
Day 43. Buffer — polish, bug fixes, performance
```

---

## Current Status

- [x] Core timer (host/watcher sync, clock-based, drift-resistant)
- [x] session_mode (host / jam / solo)
- [x] Ambient sounds (Web Audio API)
- [x] Analytics dashboard (streak, heatmap, weekly chart)
- [x] OG image generation
- [x] All CodeRabbit review fixes applied (PR #17)
- [x] Day 1 — Room rename
- [x] Day 2 — Default room names
- [x] Day 3 — Public/Private toggle
- [x] Day 4 — Pomodoro counter + long break
- [ ] Day 5 — Custom timer presets
- [ ] Day 6 — Session tags
- [ ] Day 7 — Task list in session
- [ ] Day 8 — Daily focus goal
- [x] Day 9 — Avatar upload
- [ ] Day 10 — Invite system
- [ ] Day 11 — Bonfire: Three.js setup + particle flame + flame states
- [ ] Day 12 — Bonfire: log pile
- [ ] Day 13 — Bonfire: shared fire (participant count)
- [ ] Day 14 — Bonfire: tab-switch accountability
- [ ] Day 15 — User search
- [ ] Day 16 — Follow/Unfollow
- [ ] Day 17 — Following/Followers pages
- [ ] Day 18 — Live status on profiles
- [ ] Day 19 — Friends tab on Explore
- [ ] Day 20 — Friend room notification
- [ ] Day 21 — Room reactions
- [ ] Day 22 — Accountability buddy mode
- [ ] Day 23 — Session recap screen + ashes state (4e) + guest conversion
- [ ] Day 24 — Offline / error state on session screen
- [ ] Day 25 — Room history on profile
- [ ] Day 26 — Discord OAuth login
- [ ] Day 27 — Spotify now playing
- [ ] Day 28 — Apple Music + Last.fm
- [ ] Day 29 — Discord Rich Presence
- [ ] Day 30 — PWA (manifest + service worker + install prompt)
- [ ] Day 31 — Discord bot
- [ ] Day 32 — Shared stats
- [ ] Day 33 — Shared streak
- [ ] Day 34 — Streak on session screen + at-risk warning
- [ ] Day 35 — Cold start / global feel
- [ ] Day 36 — Solo shareable card
- [ ] Day 37 — Milestone toasts
- [ ] Day 38 — Duo shareable card with bonfire (4f)
- [ ] Day 39 — Onboarding flow
- [ ] Day 40 — Scheduled rooms
- [ ] Day 41 — Weekly email digest
- [ ] Day 42 — Mobile layout audit
- [ ] Day 43 — Polish + buffer

