# Bonfire

Sit together. Do your own work. Bonfire is a shared focus timer: you light a temporary shared fire, invite a few people, and everyone sits around it on one timer.

## How it works

1. On the home page, choose **start a bonfire** or **join a bonfire** (with a 6-character code).
2. Choose your name. The creator can also give the Bonfire an optional name, such as "Deep Work".
3. You take a seat around the fire as a small illustrated character. Up to 6 people can gather.
4. Everyone shares one timer: focus, short rest, long rest.
5. **Step away** when you are done. The Bonfire keeps going for everyone else, and you can come back with the link.
6. The creator can **End Bonfire** for everyone. The link then shows that the fire has settled.

Bonfires are temporary. There are no feeds, followers, or public room lists.

### Details

- **Accounts are optional.** Guests can create and join Bonfires. Signing in (GitHub or Google) adds a persistent identity and a profile page. Focus stats are recorded for completed focus sessions in Bonfires you started while signed in.
- **Six people maximum.** The limit is enforced by the database, not just the UI.
- **Defaults are 25 · 5 · 15**: a 25 minute focus, 5 minute short rest, and 15 minute long rest, with a long rest every 4 rounds. The room shows the Bonfire name and this configuration quietly at the top, and it updates when settings change.
- **Silent by default.** No ambient sound or phase-end chime plays until you turn it on from the sound icon. Ambient sounds (rain, brown, pink, white noise) are generated with the Web Audio API and are local to each person.
- **Sharing** uses the link or the join code. Link previews read "Alex is inviting you to Deep Work", built only from values stored on the Bonfire.

## Modes

| Mode | Who can start, pause, skip, and change durations |
|---|---|
| **Focus** (default) | Only the person who lit the Bonfire |
| **Jam** | Everyone holding a seat around the fire |

The creator switches modes in settings. Being present is never enough to control the timer: every command is authorized by the database, using the creator's token or a participant's seat credential.

## Architecture

Bonfire v2 is server-authoritative. Clients send commands; the database decides what happened; everyone renders what the database declared.

```
Client
  → PostgreSQL RPC (validate, authorize, transition, persist)
  → AFTER INSERT/UPDATE trigger → pg_net HTTP POST
  → Supabase Edge Function (bonfire-relay)
  → Supabase Realtime broadcast: state_update on channel bonfire:{id}
  → every client
```

- **Timer.** The timer is clock based. The database stores `time_left` and `started_at`, and each client computes the remaining time locally. There is no per-second server timer. When a client sees a phase reach zero it calls `complete_phase`, and the database checks that the time has really run out before moving to the next phase.
- **Commands** are `SECURITY DEFINER` PostgreSQL functions: `create_bonfire`, `start_timer`, `pause_timer`, `skip_phase`, `complete_phase`, `change_settings`, `toggle_mode`, `end_bonfire`, `set_bonfire_details`, `resolve_join_code`. Clients never write to the `bonfires` table directly and never broadcast Bonfire state.
- **Seats.** `join_bonfire` gives each participant a credential and one of six seats, kept alive by a heartbeat (`touch_bonfire_seat`) and released by `leave_bonfire`. Seats are stable, so people keep their place when others arrive or leave.
- **Presence** (Supabase Realtime Presence on the same channel) decides who is drawn around the fire. It is never used for authorization.
- **Privacy.** The creator's `initiator_token` is not readable by clients. It is excluded from the column grants, from command results, and from the relay payload.

The full design is in [`docs/bonfire-v2-architecture.md`](docs/bonfire-v2-architecture.md), and the product and UI rules are in [`docs/bonfire-product-spec.md`](docs/bonfire-product-spec.md).

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS plus plain CSS for the scene (fire, characters, and motion are CSS and inline SVG)
- Supabase: PostgreSQL, Auth, Realtime (broadcast and presence), Edge Functions, `pg_net`
- `@vercel/og` for link preview images
- Vitest and Testing Library
- Deployed on Vercel

## Project structure

```
app/
  page.tsx                 Home
  bonfire/[id]/            Bonfire room (server page + metadata)
  api/bonfire/             Create and read Bonfires
  api/og/                  Link preview images
  api/cleanup/             Daily cron route (removes stale v1 sessions)
  login/, auth/callback/   Optional sign-in
  profile/[username]/      Personal focus stats
components/
  bonfire/                 Room: scene, characters, fire, timer, controls, menus
  home/                    Home and its illustrated objects
hooks/                     useBonfire, useBonfireChannel, usePresence, useSeat, useCountdown, ...
lib/                       Command wrappers, seats, characters, brand, timer, audio
supabase/
  migrations/              Database schema and RPCs
  functions/bonfire-relay/ Edge Function that publishes state_update
docs/                      Product spec and v2 architecture
```

The v1 routes (`/session/[id]`, `/explore`, `/api/session`) are still in the repository as a fallback. They are not part of the Bonfire v2 flow.

## Local development

**Requirements:** Node.js 20 and npm, a Supabase project, and the Supabase CLI (used through `npx supabase`).

1. **Install**

   ```bash
   git clone https://github.com/MinitJain/bonfire.git
   cd bonfire
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Used for |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `NEXT_PUBLIC_APP_URL` | Share links and preview images (`http://localhost:3000` locally) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client for `/api/cleanup` |
   | `CRON_SECRET` | Authorizes the `/api/cleanup` cron request |
   | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional Google Analytics 4 ID |

3. **Database**

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   This applies everything in `supabase/migrations/`, including the `pg_net` and `pgcrypto` extensions.

4. **Realtime relay**

   Deploy the Edge Function. It uses the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets that Supabase provides to Edge Functions by default.

   ```bash
   npx supabase functions deploy bonfire-relay
   ```

   The trigger finds the function through the `bonfire_relay_config` table. Migration `022_set_relay_config.sql` fills it with the original project's values, so on your own project point it at your URL and anon key (in the SQL editor):

   ```sql
   update public.bonfire_relay_config set value = 'https://<your-project-ref>.supabase.co' where key = 'supabase_url';
   update public.bonfire_relay_config set value = '<your-anon-key>' where key = 'supabase_anon_key';
   ```

   Without this, commands still work but other clients will not receive live updates.

5. **Sign-in (optional)**

   To enable accounts, turn on GitHub and/or Google under Supabase Authentication, Providers. Guests do not need this.

6. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

## Testing and verification

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Unit tests live in `__tests__/` and cover the timer, seat layout, character appearance, scene participants, command wrappers, room controls, silent-by-default audio, and invitation copy. CI (`.github/workflows/ci.yml`) runs lint, tests, typecheck, and build on pull requests to `main` and `develop`.

## Contributing

Read [`CLAUDE.md`](CLAUDE.md) first. It describes the product boundaries, the visual direction, and the rule that UI work must not change the server-authoritative architecture. Please keep writing in the repository free of em dashes.
