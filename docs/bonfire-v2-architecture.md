# Bonfire v2 - Technical Architecture

> This document is the pre-implementation blueprint. It defines the system boundaries, data models, command flows, and migration strategy for rebuilding Bonfire as a server-authoritative shared focus session.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Product Language](#2-product-language)
3. [System Diagram](#3-system-diagram)
4. [Session State Model](#4-session-state-model)
5. [Command Model](#5-command-model)
6. [Event / Realtime Model](#6-event--realtime-model)
7. [Timer Architecture](#7-timer-architecture)
8. [Presence Architecture](#8-presence-architecture)
9. [Database Design](#9-database-design)
10. [RLS / Authorization](#10-rls--authorization)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Audio Architecture](#12-audio-architecture)
13. [Auth / Profile Integration](#13-auth--profile-integration)
14. [Share / Join Architecture](#14-share--join-architecture)
15. [Migration Strategy](#15-migration-strategy)
16. [Implementation Plan](#16-implementation-plan)
17. [Testing Strategy](#17-testing-strategy)
18. [Resolved Product Decisions](#18-resolved-product-decisions)

---

## 1. Architecture Overview

Bonfire v2 moves from a client-authoritative broadcast model to a **server-authoritative command model**. The core insight: a Bonfire is a temporary shared state machine. Participants send commands. The server validates, applies, persists, and publishes. Clients render what the server declares.

### Design Principles

- **Server is the single source of truth.** No client owns the timer.
- **Commands are cheap, state is sacred.** A command is a request. State is what actually happened.
- **Presence is separate from authority.** Being present does not confer control.
- **Guest-first, auth-optional.** Starting a Bonfire takes one click. Accounts add persistence, never friction.
- **Temporary by nature.** A Bonfire exists for the duration of a focus session. It is not a persistent room.

### What Changes from v1

| Aspect | v1 | v2 |
|---|---|---|
| Timer authority | Client (host) broadcasts state | Server transitions state |
| Session modes | Host / Jam / Solo (3-way) | Focus / Jam (2-way, no visible "host") |
| State flow | Client -> broadcast -> clients | Client -> command -> server -> Postgres -> database-trigger -> broadcast -> clients |
| Presence vs control | Presence implies potential control in Jam | Presence never implies authority |
| Settings changes | Watcher request -> host approve/reject | Any authorized user commands directly (in Jam) or initiator commands (in Focus) |
| Session persistence | Timer state in broadcast only, DB as reference | Timer state authoritative in DB, broadcast as delivery mechanism |
| Guest security | Relies on client-side isHost guard | Server validates authorization per command |

---

## 2. Product Language

Bonfire's voice is calm, warm, slightly poetic, and immediately understandable. It speaks like a friend who cares about your focus, not a productivity app demanding your attention.

### Core Principles

- **Warm but not cutesy.** Avoid corporate sterility and forced enthusiasm.
- **Poetic but not obscure.** Language should feel human and inviting, never confusing.
- **Immediate.** Every label, button, and status message should be understood in under 2 seconds.
- **Calm.** No urgency, no pressure, no "crush it" energy. Focus is gentle.

### Key Phrases

| Context | Language |
|---|---|
| Start button | "Light a Bonfire" |
| Session in progress | "Focusing" |
| Short break | "Short rest" |
| Long break | "Long rest" |
| Leaving session | "Step away" |
| Session ended | "The fire has settled" |
| Join prompt | "Join the warmth" |
| Timer expired | "Time to breathe" |
| Waiting for others | "Gathering around" |

### UI Copy Guidelines

- Use present tense: "Focusing" not "Focus in progress"
- Prefer verbs over nouns: "Step away" not "Leave Session"
- Avoid jargon: "rest" not "interval break"
- Keep it short: most labels should be 1-3 words
- No exclamation marks in core UI (occasional in celebratory moments like completing a pomodoro)

---

## 3. System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Browser  │  │ Browser  │  │ Browser  │  │ Browser  │       │
│  │ (Guest)  │  │ (Auth)   │  │ (Guest)  │  │ (Auth)   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│       │  commands    │  commands    │  commands    │  commands   │
│       └──────────────┴──────┬───────┴──────────────┘             │
│                             │                                    │
│  ┌──────────────────────────┴───────────────────────────┐       │
│  │              Supabase Client (@supabase/ssr)         │       │
│  │  ┌─────────────┐  ┌────────────┐  ┌──────────────┐ │       │
│  │  │ PostgREST   │  │ Realtime   │  │ Auth         │ │       │
│  │  │ (RPC calls) │  │ (channels) │  │ (session)    │ │       │
│  │  └──────┬──────┘  └─────┬──────┘  └──────────────┘ │       │
│  └─────────┼───────────────┼────────────────────────────┘       │
└────────────┼───────────────┼────────────────────────────────────┘
             │               │
             ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE PLATFORM                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    EDGE FUNCTIONS                        │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Next.js API Routes                                 │  │  │
│  │  │ /api/og                                            │  │  │
│  │  │ /api/bonfire (creation)                            │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                          │  │
│  │          ▼                                               │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │              POSTGRES                            │   │  │
│  │  │                                                  │   │  │
│  │  │  ┌─────────────┐  ┌──────────────┐              │   │  │
│  │  │  │ bonfires    │  │ profiles     │              │   │  │
│  │  │  └─────────────┘  └──────────────┘              │   │  │
│  │  │  ┌─────────────┐  ┌──────────────┐              │   │  │
│  │  │  │ pomodoro    │  │ RLS policies │              │   │  │
│  │  │  │ _logs       │  │ + triggers   │              │   │  │
│  │  │  └─────────────┘  └──────────────┘              │   │  │
│  │  │                                                  │   │  │
│  │  │  ┌──────────────────────────────────────────┐   │   │  │
│  │  │  │ PostgreSQL FUNCTIONS (SECURITY DEFINER)   │   │   │  │
│  │  │  │  - create_bonfire()                      │   │   │  │
│  │  │  │  - start_timer()                         │   │   │  │
│  │  │  │  - pause_timer()                         │   │   │  │
│  │  │  │  - skip_phase()                          │   │   │  │
│  │  │  │  - complete_phase()                      │   │   │  │
│  │  │  │  - change_settings()                     │   │   │  │
│  │  │  │  - toggle_mode()                         │   │   │  │
│  │  │  │  - end_bonfire()                         │   │   │  │
│  │  │  │  - resolve_join_code()                   │   │   │  │
│  │  │  └──────────────────────────────────────────┘   │   │  │
│  │  │  └──────────────────────────────────────────┘   │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                          │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │           SUPABASE REALTIME                       │   │  │
│  │  │                                                  │   │  │
│  │  │  ┌────────────────┐  ┌────────────────────────┐ │   │  │
│  │  │  │ Broadcast      │  │ Presence               │ │   │  │
│  │  │  │ (state_update) │  │ (join/leave/sync)      │ │   │  │
│  │  │  └────────┬───────┘  └──────────┬─────────────┘ │   │  │
│  │  │           │                      │               │   │  │
│  │  │           └──────────┬───────────┘               │   │  │
│  │  │                      │                           │   │  │
│  │  │              ┌───────▼────────┐                  │   │  │
│  │  │              │ Channel        │                  │   │  │
│  │  │              │ bonfire:{id}   │                  │   │  │
│  │  │              └────────────────┘                  │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Boundary Explanations

**Client -> Server (Commands):**
Clients never write directly to the `bonfires` table. Instead, they call Supabase RPC functions (PostgreSQL functions callable via the PostgREST API). Each RPC function is a command handler: it validates input, checks authorization, performs the state transition, and returns the result. This means authorization logic lives in the database layer, which is the safest boundary for a server-authoritative model on Supabase.

**Server -> Database (Persistence):**
The RPC function performs the state transition and writes to the `bonfires` table in a single transaction. There is no intermediate state. The database row is the canonical truth.

**Database -> Realtime (Publication):**
After the RPC function completes, a database trigger fires and calls `pg_notify` to publish the state change. An Edge Function receives the notification and publishes the authoritative state to the Realtime channel. Clients subscribed to the channel receive the state update.

**Realtime -> Client (Rendering):**
Clients receive the broadcast payload and render it. The client never assumes what the next state should be. It renders what the server declared.

**Why PostgreSQL RPCs:**
All commands are PostgreSQL functions (SECURITY DEFINER) callable via PostgREST. This gives us:
- Full transactional control over multi-step state transitions
- Authorization logic in the database layer (safest boundary for server-authoritative model)
- No direct client writes to the database (all writes go through RPCs)
- Simple RLS policies (only SELECT needed for reading state)

---

## 4. Session State Model

### Canonical Session State (persisted in `bonfires` table)

```typescript
interface BonfireState {
  // Identity
  id: string                    // 8-char alphanumeric, primary key
  join_code: string             // 6-char alphanumeric, unique index

  // Lifecycle
  status: 'active' | 'ended'   // active = alive, ended = archived
  created_at: string            // ISO timestamp

  // Timer state (the authoritative clock)
  phase: 'focus' | 'short' | 'long'    // current phase
  running: boolean                       // true = counting down, false = paused
  started_at: number | null              // unix ms timestamp when current phase began
  time_left: number                      // seconds remaining at time of last state change
                                        // (anchor for clock-based calculation)

  // Configuration
  focus_duration: number        // seconds (default 1800 = 30 min)
  short_duration: number        // seconds (default 300 = 5 min)
  long_duration: number         // seconds (default 900 = 15 min)
  rounds_before_long: number    // default 4
  session_mode: 'focus' | 'jam' // control mode

  // Session context
  initiator_id: string | null   // user_id or null for guest
  initiator_token: string       // 128-bit random, for guest authorization
  initiator_name: string        // display name at creation
  current_round: number         // which focus round (1-indexed)

  // Analytics (denormalized for fast reads)
  completed_pomodoros: number   // count of completed focus phases in this session

  // Metadata
  last_active_at: string        // ISO timestamp, heartbeat updated

}
```

### What Is Persisted

Everything above is in Postgres. The database is the source of truth. If the database says the timer is running and started_at is X, that is what all clients must render.

### What Is Ephemeral

- **Presence data**: Participant list is ephemeral, maintained by Supabase Presence. It is not persisted in the `bonfires` table.
- **Ambient audio state**: Each client's audio player state is local and never leaves the browser.
- **UI state**: Modal open/close, scroll position, theme preference.

### What Is Derived (client-side)

Clients compute the following locally from persisted state:

```
time_remaining = max(0, time_left - floor((now - started_at) / 1000))
progress = 1 - (time_remaining / phase_duration)
is_expired = time_remaining <= 0 AND running == true
```

These values are **never sent to the server**. They are calculated identically by every client from the same authoritative data.

### What Must Never Be Client-Authoritative

- The `started_at` timestamp
- The `running` flag
- The `phase` value
- The `time_left` anchor
- The `current_round`
- Any transition from one phase to another

All of these are set exclusively by server-side RPC functions.

---

## 5. Command Model

A command is a request from a client to transition the session state. Commands are sent as Supabase RPC calls. Each command has a clear authorization rule, state transition, persistence behavior, and broadcast outcome.

### Command: `create_bonfire`

| Aspect | Detail |
|---|---|
| **Who may issue** | Anyone (guest or authenticated) |
| **Authorization** | None required (creation is always allowed) |
| **Input** | `{ focus_duration?, short_duration?, long_duration?, rounds_before_long?, session_mode?, initiator_name? }` |
| **State transition** | Creates new row in `bonfires` with status='active', running=false, phase='focus', current_round=1 |
| **Persists** | Full new row |
| **Broadcasts** | None (client navigates to the session page) |
| **Returns** | `{ id: string }` |

### Command: `start_timer`

| Aspect | Detail |
|---|---|
| **Who may issue** | Focus mode: initiator only. Jam mode: any authenticated user or guest with valid participant token. |
| **Authorization** | RPC checks: (a) if session_mode='focus', caller must be initiator_id or guest-initiator token; (b) if session_mode='jam', caller must be authenticated (auth.uid() IS NOT NULL) OR have a valid participant token. Presence alone is not authorization. |
| **Precondition** | running=false AND status='active' |
| **State transition** | Set running=true, started_at=now() |
| **Persists** | running, started_at, last_active_at |
| **Broadcasts** | `state_update` with full timer state |
| **Returns** | Updated `BonfireState` |

### Command: `pause_timer`

| Aspect | Detail |
|---|---|
| **Who may issue** | Same as `start_timer` |
| **Authorization** | Same as `start_timer` |
| **Precondition** | running=true AND status='active' |
| **State transition** | Set running=false, time_left=time_left - elapsed(now), started_at=null |
| **Persists** | running, time_left, started_at, last_active_at |
| **Broadcasts** | `state_update` with full timer state |
| **Returns** | Updated `BonfireState` |

### Command: `resume_timer`

Identical to `start_timer`. The difference is semantic: `start_timer` transitions from idle/paused to running. The same RPC handles both cases based on current state.

### Command: `skip_phase`

| Aspect | Detail |
|---|---|
| **Who may issue** | Focus mode: initiator only. Jam mode: any participant. |
| **Authorization** | Same as `start_timer` |
| **Precondition** | status='active' |
| **State transition** | Advance to next phase without completing current. Does NOT increment completed_pomodoros. Does NOT advance current_round (unless transitioning to a new focus phase). |
| **Persists** | phase, running, time_left, started_at, current_round, last_active_at |
| **Broadcasts** | `state_update` with full timer state |
| **Returns** | Updated `BonfireState` |

### Command: `complete_phase`

Called by any client when they observe the timer has expired. The server validates expiry and performs the authoritative transition. This prevents fast clients from triggering phase changes before the timer actually expires.

| Aspect | Detail |
|---|---|
| **Who may issue** | Any participant (client-initiated request) |
| **Authorization** | Any participant can call; server validates |
| **Precondition** | running=true AND server-computed time_left <= 0 |
| **State transition** | If phase='focus': increment completed_pomodoros, determine next phase (short or long based on round), advance round if entering new focus, set running=false, set new phase. If phase='short' or 'long': set phase='focus', set running=false. |
| **Persists** | All transitioned fields, last_active_at |
| **Broadcasts** | `state_update` with full timer state |
| **Returns** | Updated `BonfireState` |

**Important:** If the server rejects the request (timer hasn't actually expired yet due to clock skew), the client reverts any optimistic UI state.

### Command: `change_settings`

| Aspect | Detail |
|---|---|
| **Who may issue** | Focus mode: initiator only. Jam mode: any participant. |
| **Authorization** | Same as `start_timer` |
| **Precondition** | status='active' |
| **State transition** | Update duration/round config. If timer is running, pause it first, then apply new settings and reset the current phase with new duration. |
| **Persists** | Configuration fields, time_left, started_at, running, phase |
| **Broadcasts** | `state_update` with full timer state |
| **Returns** | Updated `BonfireState` |

### Command: `toggle_mode`

| Aspect | Detail |
|---|---|
| **Who may issue** | Initiator only (regardless of current mode) |
| **Authorization** | Caller must be initiator_id or guest-initiator token |
| **Precondition** | status='active' |
| **State transition** | Flip session_mode between 'focus' and 'jam'. Timer state is unaffected. |
| **Persists** | session_mode, last_active_at |
| **Broadcasts** | `state_update` with full state (including new session_mode) |
| **Returns** | Updated `BonfireState` |

### Command: `leave_bonfire`

This is a presence action, not a state transition. It removes the participant from presence. The session continues.

| Aspect | Detail |
|---|---|
| **Who may issue** | Any participant |
| **Authorization** | N/A (presence removal) |
| **State transition** | None (session state unchanged) |
| **Persists** | None |
| **Broadcasts** | Presence removal (automatic via Supabase) |
| **Returns** | Acknowledgment |

### Command: `end_bonfire`

| Aspect | Detail |
|---|---|
| **Who may issue** | Initiator only |
| **Authorization** | Caller must be initiator_id or guest-initiator token |
| **Precondition** | status='active' |
| **State transition** | Set status='ended', running=false |
| **Persists** | status, running |
| **Broadcasts** | `state_update` with ended status |
| **Returns** | Updated `BonfireState` |

---

## 6. Event / Realtime Model

### Commands vs Events

A **command** is what the client sends. An **event** is what the server publishes. They are not the same thing. A command may result in zero or more events.

```
Client sends:     start_timer (command)
Server processes: validates, transitions state
Server publishes: state_update (event)
```

```
Client sends:     pause_timer (command)
Server processes: validates, transitions state
Server publishes: state_update (event)
```

```
Client sends:     leave_bonfire (command)
Server processes: removes presence
Server publishes: (presence event, automatic)
```

### Event Types

There are only two broadcast event types in v2:

**`state_update`** - Published after every successful state transition. Contains the full `BonfireState`. This is the only event clients need to handle for timer/session logic.

**`participant_change`** - Published when the participant count changes (derived from presence). Contains `{ participant_count: number }`. Used for the participant count display in-session.

### Why Only Two Events

v1 had six broadcast events (`timer_update`, `share_lock`, `session_mode_update`, `activity`, `settings_request`, `settings_response`). This complexity existed because clients were negotiating state amongst themselves. With server-authoritative commands, all state changes flow through a single `state_update` event. The only other real-time information is presence changes.



### How Supabase Realtime Fits

Supabase Realtime broadcast channels remain the delivery mechanism. The key change is that broadcasts are now **database-originated** (published by the database after state transition) rather than client-originated (host broadcasts to others).

The implementation uses **pg_notify** to publish state changes from PostgreSQL to an Edge Function that broadcasts to the Realtime channel:

1. RPC function performs the state transition and persists to the database.
2. Database trigger fires after the RPC completes.
3. Trigger calls `pg_notify('bonfire_state_update', json_build_object('bonfire_id', NEW.id)::text)`.
4. Edge Function listens on the Postgres logical replication slot and receives the notification.
5. Edge Function publishes the authoritative state to the Realtime channel.
6. All clients receive the state update.

This ensures true server-authority: no client fabricates or relays state. The database is the single source of truth, and pg_notify is the single mechanism for database-to-realtime publication.

---

## 7. Timer Architecture

### Authoritative Timestamp

The timer is anchored on `started_at` (unix ms) and `time_left` (seconds at the moment of last state change).

```
time_remaining = max(0, time_left - floor((server_now() - started_at) / 1000))
```

When `running=true`, every client computes the same value from the same inputs. `started_at` is the database's clock, so clients measure against it too: `lib/serverClock.ts` estimates the offset to the server clock once per page load from `/api/time` (corrected for half the round trip). Device clocks are often seconds or minutes off; without this, two people would see different remaining times and a fast clock would ask to end the phase early.

### Client-Side Countdown

The client runs a `setInterval` at 500ms (matching v1) that recomputes `time_remaining` from the authoritative values. The interval is cosmetic - it drives the UI update. The actual timer logic is independent of the interval.

### Pause Semantics

When a client issues `pause_timer`:

1. Server receives command.
2. Server computes: `new_time_left = time_left - floor((Date.now() - started_at) / 1000)`.
3. Server sets: `running=false`, `time_left=new_time_left`, `started_at=null`.
4. Server persists and broadcasts.

After pause, clients see `running=false` and `started_at=null`. The `time_left` value is the exact seconds remaining. No computation needed.

### Resume Semantics

When a client issues `start_timer` (resume):

1. Server receives command.
2. Server sets: `running=true`, `started_at=Date.now()`.
3. Server persists and broadcasts. Note: `time_left` is NOT changed. It remains the value set during pause.

Clients then compute: `time_remaining = max(0, time_left - floor((Date.now() - started_at) / 1000))`.

### Expiration

When the client's interval computes `time_remaining <= 0`:

1. Client does NOT immediately transition. Instead, it calls `complete_phase` RPC.
2. Server validates that the timer has indeed expired (server-computes from its own clock).
3. Server performs the phase transition.
4. Server broadcasts the new state.

This prevents a fast client from triggering a phase change before the timer actually expires (edge case with clock skew).

If the phase is still at zero two seconds later (the server said "not yet", or the transition was not received), the client asks again. Any rejected command also makes the client re-read the bonfire, so a stale view corrects itself.

### Break Transitions

When a focus phase completes:

```
if current_round % rounds_before_long == 0:
    next_phase = 'long'
else:
    next_phase = 'short'
```

When a break phase completes:

```
next_phase = 'focus'
current_round += 1
```

The server computes this in the `complete_phase` RPC function. The client does not decide what the next phase is - it receives it in the state update.

### Ordering

Each row change is relayed by its own asynchronous pg_net request, so broadcasts can arrive out of order (and after the RPC result the issuer already applied). `bonfires.version` increases on every UPDATE; clients drop any state whose version is not newer than the one they hold (`isNewerState`).

### Reconnect

When a client reconnects (tab refresh, network recovery):

1. Client fetches current `BonfireState` from the database (via a read query).
2. Client initializes its local timer from the fetched state.
3. If `running=true`, client computes `time_remaining` from `started_at` and `time_left`.
4. Client subscribes to the broadcast channel for future updates.
5. Every time the channel (re)subscribes, the client reads the state again: broadcasts sent while it was not subscribed are never replayed.

No special "reconnect" command is needed. The state is always available from the database.

### Joining Halfway Through

Identical to reconnect. The joining client fetches the current state and computes the remaining time. If the timer is running, they see the correct countdown immediately.

### Background Tabs

The browser throttles `setInterval` in background tabs to ~1fps. This is acceptable because:

1. The timer display will be slightly stale when the user returns.
2. The `visibilitychange` listener recomputes immediately on tab focus.
3. If the timer expired while the tab was hidden, the client detects `time_remaining <= 0` on the next tick (or on visibility change) and calls `complete_phase`.

The server does not care whether clients are backgrounded. The server's clock is authoritative.

### Clock Differences

If Client A has `Date.now()` 500ms ahead of the server, and Client B has it 500ms behind, both will compute slightly different `time_remaining` values. The maximum discrepancy is bounded by typical clock drift (<200ms for same-machine, <500ms for cross-machine). This is visually imperceptible.

For the phase transition, the server uses its own clock to determine expiry. Clients call `complete_phase` when they observe expiry; the server confirms or rejects.

### Race Conditions

**Multiple clients call `complete_phase` simultaneously:**
The RPC function uses `FOR UPDATE` row locking. The first call processes the transition. Subsequent calls see the already-transitioned state and return it without double-processing.

**Client calls `start_timer` while another calls `pause_timer`:**
Row locking ensures serial execution. One command processes, the other operates on the resulting state (and may fail the precondition check, returning an error).

**Client calls `pause_timer` after timer already expired:**
The RPC checks `running=true` as precondition. If the timer has expired and been transitioned, `running` is already false, and the pause command is rejected.

---

## 8. Presence Architecture

### Identity

Each participant has a presence key:

- **Authenticated users**: Use their `user_id` (uuid from Supabase Auth). This is stable and unique.
- **Guest users**: Use a `pomodoro_guest_id` generated once per browser via `crypto.randomUUID()` and stored in `localStorage`. This persists across sessions in the same browser.

The presence key does not change for the duration of a session. If a guest user refreshes the page, they rejoin with the same key, which triggers the reconnect flow rather than a new join.

### Presence Data

```typescript
interface PresenceState {
  username: string | null       // display name
  avatar_url: string | null     // avatar for authenticated users
  joined_at: string             // ISO timestamp (preserved across re-tracks)
  is_initiator: boolean         // true if this participant created the session
}
```

Note: `is_initiator` replaces `is_host`. It is informational only - it does not confer different behavior at the presence level. The authorization check happens in the command layer, not in presence.

### Background Tabs

Background/minimized tabs maintain presence. Supabase Presence uses a heartbeat mechanism. When the tab is backgrounded, the browser throttles the heartbeat. Supabase's server-side presence timeout (default ~30s) will eventually remove the participant if the heartbeat stops.

To handle this, the v2 design uses a **presence re-track on visibility change**: when the tab becomes visible again, `channel.track()` is called immediately to re-establish presence before the server-side timeout fires.

A short grace period (~30s) is used before emitting leave notifications. This prevents spurious "X left" messages when users switch tabs briefly.

### Close Tab

When the browser tab is closed:
1. The page unloads, which disconnects the Supabase Realtime channel.
2. Supabase's server-side presence timeout fires (~30-60s after last heartbeat).
3. The participant is removed from presence.

No explicit leave command is needed. The timeout handles it.

### Explicit Leave

When a participant clicks "Leave":
1. Client calls `channel.untrack()` to immediately remove presence.
2. Client navigates away from the session page.

This is faster than waiting for the timeout and provides immediate feedback.

### Reconnect

When a participant reconnects (page refresh, network recovery):
1. Client joins the channel with the same presence key.
2. If Supabase still has the presence entry (within timeout), the join event is suppressed.
3. If the presence entry was removed, a new join event fires.
4. In both cases, the client calls `channel.track()` to re-establish presence.

### Presence vs Presence Count

The participant count is derived from the Presence system at runtime. It is not persisted in the database.

---

## 9. Database Design

### Option A: Reuse Existing `sessions` Table

**Pros:**
- No migration complexity.
- Existing queries continue to work.
- pomodoro_logs FK references remain valid.

**Cons:**
- Column names are legacy (`host_id`, `jam_mode`, `pomos_done`, `settings` as JSONB).
- The `host_id` column concept conflicts with the new initiator model.
- `jam_mode` boolean is obsolete alongside `session_mode` text.
- `status` column uses 'waiting' | 'active' | 'ended' which partially overlaps but doesn't match v2 needs.
- Accumulated cruft from 14 migrations makes the schema harder to reason about.
- RLS policies are complex accumulated layers.

### Option B: Create New `bonfires` Table

**Pros:**
- Clean schema designed for the v2 command model.
- No legacy columns or naming.
- Clean RLS policies from scratch.
- Clear separation between v1 and v2 during migration.
- Simpler to reason about and document.

**Cons:**
- Requires migration for existing data.
- pomodoro_logs FK needs to reference the new table (or use a view).
- Two tables exist during transition period.

### Recommendation

**Create a new `bonfires` table.** The naming distinction is deliberate: a "Bonfire" is the product concept in v2, different from a v1 "session". The old `sessions` table remains untouched for the duration of v1 support. New sessions are created in `bonfires`.

The `pomodoro_logs` table remains as-is. Its `session_id` column is nullable, so logs from v1 sessions remain valid. For v2 logs, the `session_id` field is populated with the `bonfires.id`. If the FK constraint on `session_id` references `sessions(id)`, we either:

1. Make `session_id` reference-agnostic (remove FK, keep it as text), or
2. Add a separate `bonfire_id` column to `pomodoro_logs`.

Option 1 is simpler. The `session_id` in `pomodoro_logs` becomes a free-text reference, not a constrained FK. This is acceptable because the logs are write-once and rarely joined.

---

## 10. RLS / Authorization

### The Guest-Host Problem in v1

v1's fundamental authorization issue: when a guest creates a session, `host_id IS NULL`. Postgres RLS cannot distinguish between "the guest who created this" and "any anonymous caller." The v1 workaround was a client-side `isHost` flag stored in localStorage.

### v2 Approach: Session-Scoped Tokens

When a Bonfire is created (by guest or authenticated user):

1. The `create_bonfire` RPC generates a unique `session_token` (128-bit random, stored in the `bonfires` table as `initiator_token`).
2. The token is returned to the client and stored in `localStorage` as `bonfire_token_{id}`.
3. For authenticated users, `initiator_id` is also set (their `user_id`).
4. When issuing commands, the client sends the `session_token` along with the command.
5. The RPC function verifies: either `auth.uid() = initiator_id` (authenticated) OR `token = initiator_token` (guest).

This means:
- The guest who created the Bonfire can always control it, even without auth.
- No other anonymous caller can impersonate them (they don't have the token).
- If the guest loses their localStorage (clears browser data), they lose initiator privileges. This is an acceptable tradeoff for a temporary session.

### RLS Policies (simplified)

```sql
-- Anyone can read bonfires (for join flow and session page)
CREATE POLICY "bonfires_select_public" ON bonfires
  FOR SELECT USING (status = 'active');

-- Only the RPC function writes to bonfires (via SECURITY DEFINER)
-- No direct INSERT/UPDATE/DELETE policies for clients
```

The key insight: **clients never directly write to the `bonfires` table**. All writes go through SECURITY DEFINER RPC functions that handle their own authorization. This means we don't need complex RLS write policies at all. The only RLS policies needed are for SELECT (reading state).

### Authorization in RPC Functions

Every command RPC function follows this pattern:

```sql
CREATE OR REPLACE FUNCTION start_timer(p_bonfire_id text, p_token text)
RETURNS jsonb AS $$
DECLARE
  v_bonfire record;
  v_caller_id uuid := auth.uid();
BEGIN
  -- Fetch and lock the row
  SELECT * INTO v_bonfire FROM bonfires
  WHERE id = p_bonfire_id FOR UPDATE;

  -- Not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bonfire not found';
  END IF;

  -- Authorization check
  IF v_bonfire.session_mode = 'focus' THEN
    -- Focus mode: only initiator
    IF v_caller_id IS DISTINCT FROM v_bonfire.initiator_id
       AND p_token IS DISTINCT FROM v_bonfire.initiator_token THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSIF v_bonfire.session_mode = 'jam' THEN
    -- Jam mode: authenticated users OR guests with a valid participant credential
    -- Presence alone is NOT authorization. The caller must have either:
    -- (a) auth.uid() IS NOT NULL (authenticated user), OR
    -- (b) p_token matches a valid participant token for this session
    IF v_caller_id IS NULL AND p_token IS DISTINCT FROM v_bonfire.initiator_token THEN
      RAISE EXCEPTION 'Not authorized: jam mode requires authentication or valid participant token';
    END IF;
  END IF;

  -- Precondition check
  IF v_bonfire.running THEN
    RAISE EXCEPTION 'Timer already running';
  END IF;

  -- State transition
  UPDATE bonfires SET
    running = true,
    started_at = extract(epoch from now()) * 1000,
    last_active_at = now()
  WHERE id = p_bonfire_id
  RETURNING to_jsonb(bonfires.*) INTO v_bonfire;

  RETURN v_bonfire;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Why SECURITY DEFINER

The RPC function runs with the privileges of the function owner (typically the `postgres` superuser or a dedicated `supabase_admin` role). This means:

1. The function can update the `bonfires` table regardless of RLS.
2. The function handles authorization internally.
3. Clients call the function via PostgREST (authenticated as anonymous or authenticated user), and the function does the rest.

This is the standard Supabase pattern for complex write operations.

---

## 11. Frontend Architecture

### Current Problem: SessionProvider Monolith

The current `SessionProvider.tsx` is ~1,400 lines. It manages:
- Timer state and controls
- Realtime session sync (broadcast + presence)
- Settings management
- Keyboard shortcuts
- Sign-in popover
- Mode switching
- Share panel
- Break overlay
- Ambient audio
- Guest nickname prompt
- Missed events toast
- Multiple modals and panels

This is unmaintainable and tightly couples unrelated concerns.

### v2 Component Architecture

```
app/
  page.tsx                      # Landing / home page
  bonfire/
    [id]/
      page.tsx                  # Bonfire page (server component)
      not-found.tsx
      loading.tsx
      error.tsx
  profile/
    [username]/
      page.tsx                  # Public profile
  login/
    page.tsx                    # Auth page
  api/
    og/route.tsx                # OG image generation
    session/route.ts            # Session creation (v1 compat)
    bonfire/route.ts            # Bonfire creation (v2)
    cleanup/route.ts            # Cron cleanup

components/
  bonfire/
    BonfireRoom.tsx             # Main room orchestrator (thin)
    BonfireScene.tsx            # Visual fire (reuse/refactor v1)
    ParticipantAvatar.tsx       # Individual avatar with name
    ParticipantCircle.tsx       # Circle of participants around fire
    TimerDisplay.tsx            # Large countdown display
    TimerControls.tsx           # Play/pause/skip/reset buttons
    PhaseIndicator.tsx          # Focus/short/long indicator
    SessionSettings.tsx         # Duration/round configuration
    LeaveButton.tsx             # Explicit leave action
    ShareDrawer.tsx             # Share link panel

  landing/
    LandingClient.tsx           # Landing page
    DecorativeObjects.tsx       # SVG illustrations
    TimerPreview.tsx            # Static timer preview
    ModesSection.tsx            # Focus vs Jam comparison

  home/
    HomeClient.tsx              # Logged-in home (create bonfire)

  profile/
    ProfileCard.tsx             # Avatar + name + bio
    StatsGrid.tsx               # Simple stats display
    EditProfileModal.tsx        # Profile editing
    AvatarCropModal.tsx         # Avatar upload/crop

  ui/
    Avatar.tsx                  # Avatar component (reuse v1)
    Button.tsx                  # Button component
    Logo.tsx                    # Logo (reuse v1)
    ThemeToggle.tsx             # Theme toggle (reuse v1)
    Toast.tsx                   # Toast notifications (reuse v1)

hooks/
  useTimer.ts                   # Timer logic (reuse/refactor v1)
  useBonfire.ts                 # NEW: server-authoritative session hook
  usePresence.ts                # NEW: presence-only hook
  useBonfireState.ts            # Bonfire visual state (reuse v1)
  useProfile.ts                 # Profile fetch/update (reuse v1)

lib/
  timer.ts                      # Timer utilities (reuse v1)
  bonfire.ts                    # NEW: command functions
  audio.ts                      # Audio utilities (reuse v1)
  ambient.ts                    # Ambient sound player (reuse v1)
  favicon.ts                    # Dynamic favicon (reuse v1)
  session.ts                    # Session ID generation (reuse v1)
  share.ts                      # Share utilities (reuse v1)
  date.ts                       # Date utilities (reuse v1)
  utils.ts                      # cn() and misc (reuse v1)
```

### Decomposing SessionProvider

The monolith splits into:

1. **`BonfireRoom.tsx`** (~200 lines): Thin orchestrator. Fetches initial state, sets up hooks, composes child components. No business logic.

2. **`useBonfire.ts`** (new hook, ~200 lines): Manages the server-authoritative session. Calls RPC functions for commands. Subscribes to `state_update` broadcasts. Returns `{ state, start, pause, skip, leave, settings }`.

3. **`usePresence.ts`** (new hook, ~100 lines): Manages presence only. Tracks participants. Handles join/leave notifications. Returns `{ participants, isConnected }`.

4. **`useTimer.ts`** (refactored, ~100 lines): Pure countdown logic. Receives authoritative state, computes time_remaining, fires onExpire. No broadcast logic.

5. **Individual UI components**: Each is a pure presentational component that receives props from `BonfireRoom`.

### Hook Responsibilities

```
BonfireRoom.tsx
  ├── useBonfire(sessionId)        -> { state, commands, isConnected }
  ├── usePresence(sessionId)       -> { participants }
  ├── useTimer(state)              -> { timeLeft, status, mode }
  ├── useBonfireState(state)       -> { intensity, flameLabel }
  └── [renders child components]
```

Data flows down. Commands flow up. No component reaches into another component's state.

---

## 12. Audio Architecture

### What Stays

All current audio infrastructure stays:

- `lib/audio.ts`: `playTickSound()`, `playCompleteSound()`, `requestNotificationPermission()`, `showNotification()`
- `lib/ambient.ts`: `AmbientPlayer` class with brown/pink/white/rain noise

### Where Audio Lives

Audio is **local to each participant**. It is not synchronized and not part of the session state.

**Completion sound (phase-end chime)**: Off by default. When a participant has enabled it, it plays locally when their client observes the phase ending. Each client plays it independently.

**Tick sound**: Optional, local, triggered by the timer display component. Not part of the core architecture.

**Ambient sound**: Each participant independently controls their ambient audio. Silent by default: nothing plays until the participant chooses a sound. The `AmbientPlayer` instance is created and destroyed with the session page component.

### Audio Component

```
components/bonfire/AudioControls.tsx
  - Ambient sound selector (toggle between none/brown/pink/white/rain)
  - Volume control
  - Mute toggle
  - Uses AmbientPlayer from lib/ambient.ts
```

This component is rendered by `BonfireRoom` but manages its own local state. It does not interact with the session hooks.

---

## 13. Auth / Profile Integration

### Anonymous Flow

1. User lands on `/`.
2. Clicks "Light a Bonfire".
3. `create_bonfire` RPC is called with `initiator_name` (from the random name generator).
4. A `session_token` is generated and returned.
5. Token is stored in `localStorage`.
6. User navigates to `/bonfire/[id]`.
7. Guest nickname prompt appears (if name not set).
8. User participates in the session.

No sign-in is ever required. The guest has full control of their Bonfire (as initiator).

### Authenticated Flow

1. User signs in via OAuth or email OTP.
2. Their `user_id` is available in Supabase Auth.
3. When they create a Bonfire, `initiator_id` is set to their `user_id`.
4. Their profile (display_name, avatar_url) is used as the presence display.
5. Their focus stats are updated when pomodoros complete.

### Profile Persistence

Authenticated users have a `profiles` row (auto-created on signup via trigger). Profile data:

- `username` (unique, used in URLs)
- `display_name`
- `avatar_url`
- `bio`
- `total_pomodoros`, `total_focus_minutes`, `current_streak`, `longest_streak`, `last_active_date`

Profile is editable via the profile page. The edit modal and avatar crop from v1 are reused.

### Profile as Non-Blocking

The profile page is accessible but not prominent. It exists at `/profile/[username]`. The main product flow (create/join Bonfire) never requires visiting the profile page.

---

## 14. Share / Join Architecture

### Room ID

An 8-character alphanumeric string (e.g., `a3f7k2x9`). Generated by `lib/session.ts:generateSessionId()`. This is the primary identifier.

### Short Code

A 6-character alphanumeric string (e.g., `X7K2Q8`). Generated alongside the room ID. The short code is an alternative join method for verbal sharing or quick entry. It is stored in the `bonfires` table as `join_code` with a unique index.

**Short code generation:**
- Characters: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes ambiguous characters like I, O, 0, 1)
- Length: 6 characters
- Uniqueness: Enforced by a unique index on `bonfires.join_code`
- Collision probability: ~1 in 2 billion (adequate for the product's scale)

**Short code join flow:**
1. User enters the 6-character code on the home page or join screen.
2. Client calls `resolve_join_code(code)` RPC which returns the bonfire ID.
3. Client navigates to `/bonfire/{id}`.

### URL

```
https://bonfirefocus.vercel.app/bonfire/{id}
```

### Share Mechanisms

1. **Copy link**: Clipboard API with fallback.
2. **Native share**: Web Share API on mobile.
3. **Twitter/X share**: Pre-composed tweet with link.
4. **QR code**: Not implemented, possible future addition.

### Guest Join Flow

1. Guest receives a Bonfire link (from friend, social media, etc.).
2. Guest opens the link.
3. Session page loads, fetches current state from DB.
4. If `status='ended'`, show "This Bonfire has ended" with link to create a new one.
5. If `status='active'`, join the session.
6. Guest is prompted for a display name (or uses random name).
7. Guest subscribes to the broadcast channel.
8. Guest sees the current timer state and participant list.

### Authenticated Join Flow

Same as guest, but:
- User's profile display name and avatar are used automatically.
- No nickname prompt needed.
- Their participation is logged for stats.

---

## 15. Migration Strategy

### Parallel Development

v2 is developed alongside v1 without breaking the existing application. The strategy:

1. **New table**: `bonfires` is created via a new migration. The existing `sessions` table is untouched.
2. **New API route**: `/api/bonfire` handles v2 creation. `/api/session` continues to work for v1.
3. **New route group**: `app/bonfire/[id]/` contains the v2 session page. The existing `app/session/[id]/` continues to work for v1.
4. **Shared code**: `lib/timer.ts`, `lib/audio.ts`, `lib/ambient.ts`, `lib/favicon.ts`, and UI components are shared between v1 and v2 where possible.
5. **No breaking changes**: v1 routes, components, and database tables remain functional throughout v2 development.

### Additive Migrations

All v2 migrations are additive:
- New `bonfires` table
- New RPC functions
- New RLS policies on `bonfires`
- No modifications to existing tables

The `pomodoro_logs` table gains a `bonfire_id` text column (nullable) to reference v2 sessions, but the existing `session_id` column remains for v1 compatibility.

### Reversibility

If v2 needs to be rolled back:
- Remove the `bonfires` table and associated functions.
- Remove the v2 route group.
- Remove the v2 API routes.
- v1 remains fully functional throughout.

### Feature Flags

A simple feature flag mechanism (environment variable or URL param) can control whether the home page shows the v2 creation flow or the v1 flow. This allows gradual rollout.

---

## 16. Implementation Plan

The implementation is structured as a fast MVP build in three focused phases. Phase 0 (this document) is already complete.

### Phase 1: Foundation

**Objective:** Establish the server-authoritative command layer, database schema, and client command wrappers.

**Files/systems touched:**
- New migration: `bonfires` table with all columns including `join_code`
- New migration: RPC functions (`create_bonfire`, `start_timer`, `pause_timer`, `skip_phase`, `complete_phase`, `change_settings`, `toggle_mode`, `end_bonfire`, `resolve_join_code`)
- New migration: Database trigger for `pg_notify` on state changes
- New migration: Edge Function for Realtime publication
- New migration: `bonfire_id` column on `pomodoro_logs` with unique index
- `lib/bonfire.ts`: Client-side command wrappers
- `types/index.ts`: New `BonfireState` type

**Dependencies:** Phase 0 complete (this document).

**Tests:**
- Unit tests for `lib/bonfire.ts` command wrappers
- Integration tests for RPC functions (authorization, state transitions, edge cases)
- RLS policy tests
- Idempotent pomodoro logging tests

**Rollback:** Drop the new table, functions, and trigger. No impact on v1.

**Definition of done:**
- All RPC functions pass authorization and state transition tests
- Client can create a bonfire, start, pause, resume, skip, and end it
- State is persisted correctly in Postgres
- State is broadcast correctly to connected clients via pg_notify -> Edge Function -> Realtime
- Pomodoro logging is idempotent

### Phase 2: Core Experience

**Objective:** Build the complete v2 session experience: timer, realtime, presence, and session UI.

**Files/systems touched:**
- `app/bonfire/[id]/page.tsx`: New session page
- `components/bonfire/BonfireRoom.tsx`: Room orchestrator
- `components/bonfire/ParticipantCircle.tsx`: Avatar arrangement
- `components/bonfire/TimerDisplay.tsx`: Countdown display
- `components/bonfire/TimerControls.tsx`: Control buttons
- `components/bonfire/PhaseIndicator.tsx`: Phase display
- `components/bonfire/SessionSettings.tsx`: Settings panel
- `components/bonfire/ShareDrawer.tsx`: Share panel
- `components/bonfire/AudioControls.tsx`: Ambient sound
- `components/session/BonfireScene.tsx`: Reused/refactored fire animation
- `hooks/useBonfire.ts`: New hook for server-authoritative session management
- `hooks/usePresence.ts`: New hook for presence only
- `hooks/useTimer.ts`: Refactored for v2 (pure countdown, no broadcast logic)
- `lib/timer.ts`: Minor additions if needed

**Dependencies:** Phase 1 complete.

**Tests:**
- Unit tests for `useTimer` (countdown, expiry, pause/resume)
- Unit tests for `useBonfire` (command dispatch, state updates)
- Unit tests for `usePresence` (join/leave/reconnect)
- Component rendering tests
- Interaction tests (click start, verify state update)
- Accessibility tests
- Two-client synchronization tests

**Rollback:** Remove the v2 route group and new hooks. v1 session page remains.

**Definition of done:**
- v2 session page renders correctly with timer, controls, participants, settings, share, audio
- Timer counts down correctly across clients
- Pause/resume/skip works across clients
- Phase transitions (focus -> break -> focus) work
- Focus/Jam mode switching works with correct authorization
- Reconnecting client sees correct state
- Background tabs maintain presence
- Dark/light theme works

### Phase 3: Launch

**Objective:** Build the landing page, join flow, and final polish for launch.

**Files/systems touched:**
- `app/page.tsx`: Updated landing/home
- `components/landing/LandingClient.tsx`: New landing design
- `components/landing/DecorativeObjects.tsx`: SVG illustrations
- `components/home/HomeClient.tsx`: Logged-in home
- `app/api/bonfire/route.ts`: Bonfire creation API
- Profile stats via `increment_profile_stats`
- Performance profiling
- Accessibility audit
- Mobile responsiveness

**Dependencies:** Phase 2 complete.

**Tests:**
- Landing page rendering
- Create bonfire flow (click -> navigate to session)
- Join bonfire flow (enter ID/code -> navigate to session)
- Profile stats update correctly
- E2E test suite
- Performance benchmarks
- Accessibility audit (WCAG 2.1 AA)

**Rollback:** Revert page.tsx to v1 version. Full v2 can be disabled via feature flag.

**Definition of done:**
- Landing page matches design spec
- "Light a Bonfire" creates a session and navigates to it
- "Join the warmth" accepts an ID/code and navigates to the session
- Logged-in users see their profile in the header
- Profile stats (total_pomodoros, total_focus_minutes, streaks) update correctly
- All tests pass
- No performance regressions
- Accessibility requirements met
- Mobile experience is polished
- v1 remains functional as fallback

---

## 17. Testing Strategy

### Unit Tests

**Timer logic (`lib/timer.ts`):**
- `computeTimeLeft` with various states (running, paused, idle, finished)
- `createTimerState` for each mode
- `sessionToTimerState` mapping
- `formatTime` edge cases
- `computeProgress` edge cases
- Clock drift simulation (started_at 100ms in the past)

**Command wrappers (`lib/bonfire.ts`):**
- Each command function sends correct payload
- Error handling for failed RPC calls
- Token attachment for guest initiators

**Presence (`usePresence.ts`):**
- Participant list updates on join/leave
- Reconnect detection (same key, different channel)
- Grace period behavior

### Integration Tests

**RPC functions (via Supabase test client or local Postgres):**
- `create_bonfire`: Creates row with correct defaults, returns ID and token
- `start_timer`: Validates authorization, sets running/started_at
- `pause_timer`: Validates running state, computes time_left correctly
- `skip_phase`: Advances to correct next phase
- `complete_phase`: Phase transitions, round increments, pomodoro counting
- `change_settings`: Updates config, resets timer if running
- `toggle_mode`: Flips session_mode
- `end_bonfire`: Sets status='ended'

**Authorization:**
- Guest initiator can control their bonfire
- Non-initiator cannot control focus-mode bonfire
- Jam mode: authenticated users or guests with valid participant token can control
- Invalid token is rejected
- Ended bonfire rejects commands

### Component Tests

**Session page:**
- Renders timer display with correct initial state
- Controls are enabled/disabled based on authorization
- Participant avatars render
- Share drawer opens and copies link

**Landing page:**
- Create button navigates to new session
- Join input validates session ID format

### Realtime Tests

- Two clients subscribe to same channel
- State update received by both clients
- Presence sync works
- Reconnect after disconnect

### Background Tab Tests

- Timer continues correctly when tab is backgrounded
- `visibilitychange` recomputes correctly
- Expired timer detected after background period

### Session Transition Tests

- Focus -> short break transition
- Focus -> long break transition (at round boundary)
- Break -> focus transition
- Settings change during running timer
- Mode toggle (focus <-> jam)

### Jam Mode Tests

- Any participant can start/pause in jam mode
- State updates are received by all participants
- Mode toggle restricted to initiator

---

## 18. Resolved Product Decisions

The following questions have been resolved and are documented here for reference.

| Question | Decision |
|---|---|
| **Session Lifetime** | Ended Bonfires are cleaned up after 7 days of inactivity. |
| **Guest Token Persistence** | No recovery mechanism. If a guest clears localStorage, they lose initiator privileges. This is an acceptable tradeoff for a temporary session. |
| **Timer Expiration Notification** | No automatic notification permission request. The browser's default notification behavior is used. |
| **Ambient Sound Persistence** | Bonfire is silent by default. The last ambient choice may be remembered locally only as a suggestion; it never autoplays on a later visit. The phase-end chime is off by default. |
| **Mobile Experience** | Responsive design with no separate mobile architecture. Controls adapt to smaller screens. |
| **Offline Support** | Automatic reconnect on network recovery. No offline commands are supported. |
| **Multiple Bonfires** | Users may create or participate in multiple Bonfires simultaneously (e.g., in different browser tabs). No UI restriction. |
| **Spotify Integration** | Fully deferred. No schema preparation now. |
