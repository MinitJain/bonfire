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

## PRs

| PR | Branch | Status |
|---|---|---|
| #39 | `chore/local-supabase-csp` | open |
