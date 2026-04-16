import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export const metadata: Metadata = {
  title: 'Explore Live Rooms',
  description: 'Join a live focus room happening right now.',
}

export const revalidate = 10

interface ParticipantPreview {
  username: string | null
  avatar_url: string | null
}

// Stable color from name hash
function nameToColor(name: string | null): string {
  if (!name) return '#5A5A50'
  const palette = ['#E8472A', '#1A7A5E', '#B8610A', '#5B4FCF', '#C2185B', '#00838F', '#7B5EA7']
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.split(/[-_ ]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// SVG circular timer ring
function TimerRing({ timeLeft, totalTime }: { timeLeft: number; totalTime: number }) {
  const size = 88
  const stroke = 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const progress = totalTime > 0 ? Math.min(timeLeft / totalTime, 1) : 0
  const offset = circ * (1 - progress)

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      {/* Time label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  )
}

const modeMeta: Record<string, { label: string; color: string; bg: string }> = {
  focus: { label: 'Focus',       color: 'var(--accent)',  bg: 'var(--accent-soft)' },
  short: { label: 'Short Break', color: 'var(--amber)',   bg: 'var(--amber-soft)' },
  long:  { label: 'Long Break',  color: 'var(--green)',   bg: 'var(--green-soft)' },
}

export default async function ExplorePage() {
  const supabase = createClient()
  const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString()

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, title, host_name, mode, session_mode, time_left, total_time, last_active_at, participant_count, participant_preview')
    .eq('running', true)
    .eq('is_public', true)
    .neq('session_mode', 'solo')
    .gt('last_active_at', ninetySecondsAgo)
    .order('participant_count', { ascending: false })
    .order('last_active_at', { ascending: false })
    .limit(20)

  if (error) throw error

  const totalFocusing = sessions?.reduce((sum, s) => sum + (s.participant_count ?? 1), 0) ?? 0

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header
        className="flex items-center justify-between px-5 sm:px-8 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/"><Logo size="md" /></Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-5 sm:px-8 py-12">

        {/* Header row */}
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Live Now</span>
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Explore Rooms
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Join a focus room that&apos;s happening right now.
            </p>
          </div>

          {/* Total focusing counter */}
          {totalFocusing > 0 && (
            <div
              className="flex-shrink-0 text-right px-5 py-3 rounded-2xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
                {totalFocusing}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Focusing Now
              </div>
            </div>
          )}
        </div>

        {/* Grid / empty state */}
        {!sessions || sessions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center py-24 rounded-3xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="text-5xl mb-4">🍅</div>
            <h2 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
              No live rooms right now
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Be the first to start one!
            </p>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Start a room →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(session => {
              const mode = modeMeta[session.mode] ?? { label: session.mode, color: 'var(--text-muted)', bg: 'var(--bg-secondary)' }
              const preview = (session.participant_preview ?? []) as ParticipantPreview[]
              const count = session.participant_count ?? 1
              const timeLeft = session.time_left ?? 0
              const totalTime = session.total_time ?? 1500
              const shown = preview.slice(0, 2)
              const overflow = count - shown.length

              return (
                <Link
                  key={session.id}
                  href={`/session/${session.id}`}
                  className="group flex flex-col justify-between p-5 rounded-3xl transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    minHeight: 200,
                  }}
                >
                  {/* Top: timer ring + mode badge */}
                  <div className="flex items-start justify-between mb-4">
                    <TimerRing timeLeft={timeLeft} totalTime={totalTime} />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 ml-2"
                      style={{ background: mode.bg, color: mode.color }}
                    >
                      {mode.label}
                    </span>
                  </div>

                  {/* Middle: room title */}
                  <div className="flex-1 mb-4">
                    <h2 className="font-display font-bold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {session.title ?? 'Focus Room'}
                    </h2>
                  </div>

                  {/* Bottom: avatar stack + count */}
                  <div className="flex items-center gap-2">
                    {/* Avatar circles */}
                    <div className="flex items-center">
                      {shown.map((p, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden"
                          style={{
                            background: p.avatar_url ? 'var(--bg-secondary)' : nameToColor(p.username),
                            color: '#fff',
                            border: '2px solid var(--bg-elevated)',
                            marginLeft: i > 0 ? '-6px' : 0,
                            position: 'relative',
                            zIndex: shown.length - i,
                          }}
                        >
                          {p.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatar_url} alt={p.username ?? ''} className="w-full h-full object-cover" />
                          ) : (
                            initials(p.username)
                          )}
                        </div>
                      ))}
                      {overflow > 0 && (
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                          style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-muted)',
                            border: '2px solid var(--bg-elevated)',
                            marginLeft: '-6px',
                          }}
                        >
                          +{overflow}
                        </div>
                      )}
                    </div>

                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {count === 1 ? 'Focusing now' : `${count} focusing${count >= 5 ? ' 🔥' : ''}`}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <footer className="px-5 sm:px-8 py-5 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--accent)' }}>← Back to home</Link>
      </footer>
    </div>
  )
}
