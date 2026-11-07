# Automation log

Human-readable summary of the automated UX / refresh / avatar run.
The timestamped action log is `~/bonfire-automation.log` on the machine that ran it.

## Commands (from README.md / CLAUDE.md / package.json)

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` (http://localhost:3000) |
| Tests | `npm test` (Vitest) |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` |
| Local database | `npx supabase start` (Docker), then `npx supabase functions serve --no-verify-jwt` for the relay |

### Local database notes

- `.env.local` points at the hosted Supabase project. For local work, a gitignored
  `.env.development.local` overrides it with the `supabase start` URL and anon key.
- Migration `022_set_relay_config.sql` hard-codes the hosted project's URL in
  `bonfire_relay_config`. After `supabase start`, repoint it, or local triggers will
  POST to the hosted relay:
  ```sql
  update public.bonfire_relay_config set value = 'http://kong:8000' where key = 'supabase_url';
  update public.bonfire_relay_config set value = '<local anon key>' where key = 'supabase_anon_key';
  ```
- The dev CSP needs PR #39 to allow the local origin.

## Phase 1: Orientation (2026-11-07)

- Local checkout was on `feat/home-setup-and-room-polish` (already squash-merged as #37). Switched to `main`, fast-forwarded.
- Baseline: 128/128 tests pass, lint clean, typecheck clean. No pre-existing failures.

## Decisions taken with the owner before starting

- **Phase 3 scope:** chunky and playful look only. No badges or streaks, because CLAUDE.md lists gamification and shared streaks as product boundaries.
- **Merging:** PRs are opened autonomously; every merge waits for the owner's explicit OK.
- **Database:** all walkthroughs run against a local Supabase stack, never the hosted project.
- **Avatar persistence:** approved: a migration for signed-in users, localStorage for guests.

## Phase 2: UX review

See `docs/ux-review/REVIEW.md`. Fixes are in branch `ux/review-fixes`.

## Final summary (2026-11-08)

### Merged
| PR | What |
|---|---|
| #39 | Dev CSP allows a local Supabase stack |
| #40 | UX review fixes: AA contrast tokens, 44px targets, hydration error on reload, `/explore` removed, 404 copy |
| #44 | Chunky, pressable UI refresh, done by a sub-agent and reviewed (replaces #42, which GitHub auto-closed when its base branch was deleted) |
| #41 | Character customizer (feminine/neutral/masculine body, 5 hairstyles, 3 outfits, 4 accessories, colours). Saved to `profiles.character` when signed in, localStorage for guests; presence re-track debounce |
| #45 | SEO gaps: login and 404 titles, current JSON-LD description |
| #43 | Motion (`motion@14.6.0`): character select sheet before the fire, Home entrance, spring popovers, rolling timer digits |

### Decisions
- No badges or streaks (CLAUDE.md product boundary), confirmed by the owner.
- Customizing happens before the bonfire (name step), not in the room; requested by the owner.
- CodeRabbit doesn't auto-review this repo (<10 stars) and was rate-limited on manual requests. The owner approved merging on green CI when CodeRabbit left no comments. Only #39 got a review (PR description template), which was fixed.
- Production migration `20261107120000_profile_character.sql` was applied by the owner with `supabase db push --remote`. A manual SQL-editor run had already created the constraint, so the migration was made re-runnable.

### Left for later
- Delete v1 leftovers: `components/{session,landing,timer,share}`, `app/session/[id]`, `lib/session.ts` (REVIEW.md P2-6).
- The room still scrolls slightly at 1366x768.
- With Motion, Home starts at opacity 0 until JS hydrates.
- `profiles` RLS lets owners update every column of their row, including stats (pre-existing; consider column grants).
- Local auth `site_url` is `127.0.0.1:3000`, so local sign-in only works on that host.
