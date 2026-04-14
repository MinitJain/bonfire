import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Users, Timer, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Explore Live Rooms',
  description: 'Join a live focus room happening right now.',
}

export const revalidate = 30 // revalidate every 30 seconds

export default async function ExplorePage() {
  const supabase = createClient()

  const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString()

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, title, host_name, mode, running, last_active_at, status')
    .eq('running', true)
    .neq('session_mode', 'solo')
    .gt('last_active_at', ninetySecondsAgo)
    .order('last_active_at', { ascending: false })
    .limit(20)

  if (error) throw error

  const modeLabel: Record<string, string> = {
    focus: '🍅 Focus',
    short: '☕ Short Break',
    long: '🎉 Long Break',
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="flex items-center justify-between px-5 sm:px-8 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/"><Logo size="md" /></Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Live Now</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-3" style={{ color: 'var(--text-primary)' }}>
            Explore Rooms
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Join a focus room that&apos;s happening right now. No account required.
          </p>
        </div>

        {!sessions || sessions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center py-20 rounded-2xl"
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
          <div className="flex flex-col gap-3">
            {sessions.map(session => (
              <Link
                key={session.id}
                href={`/session/${session.id}`}
                className="group flex items-center justify-between p-5 rounded-2xl transition-all duration-200"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {session.title ?? 'Focus Room'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {session.host_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {modeLabel[session.mode] ?? session.mode}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="px-5 sm:px-8 py-5 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--accent)' }}>← Back to home</Link>
      </footer>
    </div>
  )
}
