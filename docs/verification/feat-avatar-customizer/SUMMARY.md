# Verification: feat/avatar-customizer

Local stack: `supabase start` with all migrations plus `20261107120000_profile_character.sql`, and `next dev`. Playwright, headed Chrome.

## Checked

| What | Result |
|---|---|
| Editor opens from the shirt icon; the preview updates on every pick | ✅ `02`–`05` |
| Feminine, neutral and masculine bodies; 5 hairstyles; 3 outfits; 4 accessories; skin, hair and outfit colours | ✅ `03`, `04`, `05` |
| Your own seated figure updates live | ✅ `03`, `08` |
| A second guest (mobile) sees the customized figure through presence | ✅ `06` |
| Guest: choice persists across reloads (localStorage `bonfire_character`) | ✅ `08` |
| Signed in: choice saved to `profiles.character`; a brand-new browser session on the same account restores it, with nothing in localStorage | ✅ `09` |
| Mobile 390px: popover fits (left 58, right 378), scrolls inside, no horizontal page scroll | ✅ `07` |
| Esc closes; every option is a labelled button in a labelled group; swatches have colour names | ✅ |
| DB: the check constraint rejects an out-of-range index, an extra key, a fractional value, a string number, and a non-object | ✅ (psql) |
| RLS: another user's update of my row affects 0 rows | ✅ (supabase-js as two users) |

## Found and fixed during verification

- **Presence rate limit.** Clicking quickly through options re-tracked presence on every click. Realtime answered "Client presence rate limit exceeded" and closed the channel, so the room got stuck on "reconnecting…" and others stopped seeing you. Re-tracks are now debounced (600 ms, trailing; the first track is still immediate). Covered by `__tests__/hooks/usePresence.test.tsx`.

## Looks off / not covered

- Signed-in browser login only works on `127.0.0.1:3000` locally, because the local auth `site_url` doesn't allow the `localhost` callback. This is local setup only.
- The character is only cosmetic in presence. Other clients validate it with `parseChoice` and fall back to the generated look.
