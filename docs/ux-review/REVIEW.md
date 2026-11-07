# Bonfire UI/UX review — 2026-11-07

Walked with Playwright (headed Chrome) against a local Supabase stack, two browser
contexts (host + guest) so realtime join, start, and end-for-everyone were exercised.
Widths: desktop 1440×900, mobile 390×844. Both themes. Screenshots in `screenshots/`.
Contrast was measured by script (computed colour, opacity flattened, nearest opaque
background) against WCAG AA: 4.5:1 body text, 3:1 large text.

Flows covered: Home (presets, custom, join), start → name prompt → room (idle,
running, two people), Invite / Sound / Settings popovers, keyboard tab order,
End Bonfire confirm → settled (host and guest), login, privacy, 404s, `/explore`,
`/profile/<unknown>`.

Overall: the core scene is strong. The fire reads as the centre, the characters are
charming, the hierarchy in the room is clear, focus rings are consistent (2px
orange outline on every control), and realtime sync worked first time. Most issues
are light-theme contrast and leftovers from v1.

## P0 — broken or inaccessible

| # | Finding | Where |
|---|---|---|
| P0-1 | **Light theme fails AA on core labels.** `--text-muted` (#7F8FA3) is 2.9:1 on the page background. Fails on Home "focus for", "rounds", the rests note, and the room's "Step away". | `app/globals.css` `:root --text-muted`; `components/home/FocusSetup.tsx`, `components/bonfire/RoomActions.tsx` |
| P0-2 | **Room title and config fail AA in both themes.** Opacity 0.62 / 0.6 on the text drops "Deep Work" to 3.8:1 (light) and "25 · 5 · 15" to 2.4:1 (light) and 3.7:1 (dark). | `app/globals.css` `.bf-room-name`, `.bf-room-config`; `components/bonfire/RoomTitle.tsx` |
| P0-3 | **Hydration error on every reload of a running room.** The server renders the countdown one second before the client does. React throws "Text content does not match", throws away the server HTML and re-renders the room on the client. In dev, the error overlay covers End Bonfire on mobile. | `components/bonfire/TimerDisplay.tsx` (`.bf-time` span), `hooks/useCountdown.ts` |
| P0-4 | **Primary buttons on error pages fail AA.** White text on orange is 2.5:1 on "Start a new room" (404, profile 404), "Light a new Bonfire" (room 404) and `/explore`. Login "Continue" (disabled) is 1.6:1. | `app/not-found.tsx`, `app/bonfire/[id]/not-found.tsx`, `app/profile/[username]/error.tsx`/`page.tsx`, `app/login/page.tsx` |

## P1 — clearly poor UX

| # | Finding | Where |
|---|---|---|
| P1-1 | **`/explore` is still live.** It shows an "Explore Rooms / LIVE NOW" page, which CLAUDE.md lists as a product boundary not to reintroduce. Nothing links to it, but the URL resolves and is indexable. | `app/explore/*` |
| P1-2 | **Touch targets below 44px on mobile.** Header icon buttons are 36×36; Pause/Skip/Step away/End Bonfire are 36–37px tall. | `components/bonfire/RoomMenu.tsx`, `TimerControls.tsx`, `RoomActions.tsx`; `.bf-icon-btn`, `.bf-text-btn` in `globals.css` |
| P1-3 | **Selected-chip contrast 4.2:1 (light).** `--accent-strong` on `--accent-soft` is just under AA, so the selected "25" is the hardest chip to read. | `globals.css` `--accent-strong`, `.bf-chip[aria-pressed]` |
| P1-4 | **Login copy and style come from v1.** "Track focus streaks, pomodoros, and more" promises streaks. The card, divider and buttons use the old SaaS card look instead of the scene. Muted labels are 3.9:1. | `app/login/page.tsx` |
| P1-5 | **Error pages say "room".** "Start a new room" (404) and "Start a room →" (explore) use v1 vocabulary. Everywhere else the product says "bonfire". | `app/not-found.tsx`, `app/profile/[username]/*` |

## P2 — polish

| # | Finding | Where |
|---|---|---|
| P2-1 | The settled screen has no heading. "The fire has settled" is a `<p>`, so screen-reader users get no landmark title. | `components/bonfire/SettledScene.tsx` |
| P2-2 | The route announcer keeps the old title ("Sleepy Finch's fire") after the bonfire is renamed. | `app/bonfire/[id]/page.tsx` metadata vs client title |
| P2-3 | No skip link; the tab order starts in the header on every page (4 stops before the timer). Low cost with so few stops. | `app/layout.tsx` |
| P2-4 | On mobile the two characters sit at the screen edges with labels in 11px type, far from the fire. The ring could be smaller. | `components/bonfire/CampfireCircle.tsx` |
| P2-5 | The empty "Skip ·" separator dot is 3px and reads as dirt next to the Start pill. | `components/bonfire/TimerControls.tsx` |
| P2-6 | Dead v1 code is still shipped: `components/{session,landing,timer,share}`, `app/session/[id]`, `lib/session.ts`. Not user-visible except through `/session/<id>`. | listed paths |

## Not issues (checked)

- Focus rings: visible on every control in both themes.
- Settings dialog: labelled fields, Esc closes, values announced.
- End Bonfire uses an inline confirm (no `window.confirm`) and reaches the guest in about 1s.
- No horizontal scroll at 390px. The home objects stay clear of the controls.
- Timer has `role="timer"` and the progress bar has value text.

## Fix plan

`ux/review-fixes` takes P0-1…4, P1-1…3, P1-5 and P2-1. P1-4 (login restyle) and P2-4/5 fold
into the Phase 3 visual refresh. P2-6 (deleting v1 code) is a separate cleanup and
is left as a recommendation.
