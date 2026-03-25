<div align="center">
  <h1>🍅 PomodoroJam</h1>
  <p>The shared Pomodoro timer. Start a session, share the link, focus together.</p>

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-realtime-green?style=flat-square&logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-deployed-black?style=flat-square&logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Issues](https://img.shields.io/github/issues/MinitJain/pomodoro-jam?style=flat-square)](https://github.com/MinitJain/pomodoro-jam/issues)

**[→ Try it live](https://pomodoro-jam.vercel.app)** · [Report a bug](https://github.com/MinitJain/pomodoro-jam/issues) · [Request a feature](https://github.com/MinitJain/pomodoro-jam/issues)

![Landing Page](docs/screenshots/landing.png)
![Landing page features](docs/screenshots/landing2.png)
![Landing page onboarding](docs/screenshots/landing3.png)

</div>

---

## Why PomodoroJam?

Solo focus is hard. Shared accountability makes it stick. One person starts a timer, shares a link — everyone joins and sees the exact same second. When it ends, everyone breaks together. No meetings. No coordination. Just shared focus.

---

## Features

### Synchronized Timer

![Focus timer](docs/screenshots/focusTimer.png)
![Short break timer](docs/screenshots/shortBreakTimer.png)
![Long break timer](docs/screenshots/longBreakTimer.png)

The timer is clock-based using a `startedAt` Unix timestamp rather than a local countdown. This means everyone in the session — regardless of when they joined or how bad their connection is — always sees the correct second. No drift, no skew.

---

### Host Mode & Jam Mode

![Host mode](docs/screenshots/hostMode.png)
![Jam mode](docs/screenshots/jamMode.png)

Every session has two control modes you can switch between at any time:

- **Host mode** — only the host can start, pause, skip, or change settings. Everyone else follows along in sync.
- **Jam mode** — anyone in the session can control the timer, like a group decision. Great for teams where everyone should have equal say.

The current mode is visible to all participants in real time.

---

### Watcher Settings Requests

![Watcher settings request](docs/screenshots/watcherSettings.png)

Watchers can't change settings directly, but they can request a change. The host receives an inline card showing exactly what the watcher wants to change — a diff of old vs. new values — and can accept or reject with one tap. If accepted, the settings apply immediately for everyone.

---

### Focus Noise

![Focus noise panel](docs/screenshots/focusNoise.png)

Four ambient sounds generated entirely by the Web Audio API — no CDN, no external files, no latency:

- 🟤 **Brown noise** — deep, rumbling background hum
- ⚪ **White noise** — broad-spectrum static
- 🌸 **Pink noise** — softer mid-range tone
- 🌧️ **Rain** — gentle rainfall texture

The panel is collapsible. A green pulse dot appears next to "Focus Noise" when a sound is active, so you always know something's playing.

---

### Live Participants & Activity Feed

See who's focusing alongside you via real-time presence. When someone joins or leaves, a floating activity message appears at the bottom of the screen. The same feed shows timer events — when someone starts, pauses, or skips — so the whole group stays in the loop without any chat.

---

### Guest Nicknames

![Guest nickname prompt](docs/screenshots/guestNickname.png)

No account needed. Guests are prompted to set a display name when they first join a session. The name is saved per-session in `localStorage` so it persists across page reloads. It shows up in the participant list and activity feed for everyone in the room.

---

### Timer Settings

![Settings panel](docs/screenshots/Settings.png)

Fully configurable per-session:

- Focus, short break, and long break durations (in minutes)
- Long break interval (how many focus rounds before a long break)
- Auto-start breaks — break timer starts automatically when focus ends
- Auto-start pomodoros — focus timer restarts automatically after a break

Settings are persisted to the database and broadcast to all participants when applied.

---

### Break Overlay & Notifications

![Break overlay](docs/screenshots/breakOverlay.png)

When the timer ends, a full-screen break overlay appears for all participants simultaneously. Browser push notifications fire at the same moment — useful if you've switched tabs. The overlay disappears as soon as the next session starts.

---

### Analytics Dashboard

![Analytics dashboard](docs/screenshots/analyticsDashboard.png)

Authenticated users get a personal analytics dashboard at `/profile/[username]`:

- **Total pomodoros** and **focus hours** completed
- **Current streak** — consecutive days with at least one completed session
- **Weekly bar chart** — last 7 days of focus activity
- **GitHub-style heatmap** — 52-week calendar showing daily pomodoro counts

All data is logged to the `pomodoro_logs` table whenever a focus session completes.

---

### Explore Page

![Explore page](docs/screenshots/explorePage.png)

Browse all live sessions happening right now without needing a direct link. The explore page shows active sessions updated in the last 5 minutes — session title, host name, and current mode. Click any card to join instantly.

---

### One-Tap Share

<!-- SCREENSHOT: Share panel / invite button -->

The share panel lets you copy the session link or trigger the native OS share sheet (on mobile). Guests can only share if the host has "Allow guests to invite" enabled in settings — the host controls whether the room is open or invite-only.

---

### Dark / Light Theme & PWA

![Dark mode](docs/screenshots/darkMode.png)
![Light mode](docs/screenshots/lightMode.png)

Theme toggles between dark and light, persisted per device. The app is installable as a PWA on mobile and desktop — the favicon and tab title update live with the current timer countdown.

---

## How it works

1. **Start** — click "Start a session" on the landing page
2. **Share** — hit the Invite button and send the link to anyone
3. **Pick your mode** — toggle between **Host** (you lead) and **Jam** (everyone drives)
4. **Focus** — hit Play. Everyone sees the same countdown, on the same second
5. **Break** — timer ends, notifications fire, break overlay appears for everyone

No account needed. Start in under 30 seconds.

---

## Stack

| Layer     | Technology                            |
| --------- | ------------------------------------- |
| Framework | Next.js 14 App Router                 |
| Language  | TypeScript (strict)                   |
| Database  | Supabase (PostgreSQL + Realtime)      |
| Auth      | Supabase Auth (GitHub + Google OAuth) |
| Styling   | Tailwind CSS + CSS variables          |
| Theme     | next-themes (dark/light, persisted)   |
| OG Images | @vercel/og                            |
| Fonts     | Syne + DM Sans + JetBrains Mono       |

---

## Getting Started

**Prerequisites:** Node.js 18+, a Supabase account (free), npm

**1. Clone and install**

```bash
git clone https://github.com/MinitJain/pomodoro-jam.git
cd pomodoro-jam
npm install
```

**2. Set up environment variables**

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**3. Set up the database**

Run the migrations in your Supabase SQL editor in order:

```text
supabase/migrations/001_init.sql
supabase/migrations/002_jam_mode.sql
supabase/migrations/003_rls_sessions.sql
supabase/migrations/004_session_expiry.sql
supabase/migrations/005_log_pomodoros.sql
```

Or push via the Supabase CLI:

```bash
npx supabase db push
```

**4. Enable OAuth providers**

Supabase → Authentication → Providers → enable GitHub and/or Google, add your Client ID and Secret.

**5. Run locally**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MinitJain/pomodoro-jam)

After deploying, complete these three steps or auth will break:

1. Supabase → Authentication → URL Configuration → add your Vercel URL to **Redirect URLs**
2. Google Cloud Console → OAuth client → add your Vercel domain to **Authorized JavaScript origins**
3. Set `NEXT_PUBLIC_APP_URL` in Vercel environment variables to your live URL

---

## Contributing

PRs are welcome. For major changes, open an issue first.
This repo uses [CodeRabbit](https://coderabbit.ai) for AI code review — every PR gets reviewed automatically.

---

## License

MIT
