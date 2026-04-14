'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { Users, Zap, Github, LogOut, UserCircle, Timer, Bell, BarChart2, Link2, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ModesSection } from '@/components/landing/ModesSection'
import { TimerPreview } from '@/components/landing/TimerPreview'

interface LandingClientProps {
  user: User | null
  profileUsername: string | null
  activeSessionCount: number
}

const features = [
  {
    icon: Zap,
    title: 'Real-time sync, zero lag',
    desc: 'Clock-based timers keep every participant on the exact same second. Always.',
  },
  {
    icon: Users,
    title: 'Three modes for every workflow',
    desc: 'Host controls the clock, Jam lets everyone drive, Solo keeps it private.',
  },
  {
    icon: Bell,
    title: 'Break notifications',
    desc: "Browser alerts fire for every participant the moment a room ends.",
  },
  {
    icon: BarChart2,
    title: 'Streaks and focus history',
    desc: 'Daily streaks, weekly charts, and a full heatmap of your focus rooms.',
  },
  {
    icon: Link2,
    title: 'Share in one tap',
    desc: 'One link. Anyone can join instantly. No app download, no account required.',
  },
  {
    icon: Timer,
    title: 'Works as a solo timer too',
    desc: "Don't have a group? Use Solo mode for pure, distraction-free focus.",
  },
]

const steps = [
  { n: '01', title: 'Start a room', desc: 'Hit the button. A unique link is generated instantly. No setup.' },
  { n: '02', title: 'Invite your team', desc: 'Send the link via Slack, WhatsApp, Discord. Wherever you work.' },
  { n: '03', title: 'Focus in sync', desc: 'Everyone runs the same timer. When it ends, everyone takes a break.' },
]

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)


function LandingContent({ user, profileUsername, activeSessionCount }: LandingClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [ctaRipples, setCtaRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const ctaBtnRef = useRef<HTMLButtonElement>(null)
  const rippleTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const [showSignInMenu, setShowSignInMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const signInRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('welcome') === '1') {
      toast('Signed in successfully!', 'success', 4000)
      const url = new URL(window.location.href)
      url.searchParams.delete('welcome')
      window.history.replaceState({}, '', url.toString())
    }
  }, [toast])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false)
      if (signInRef.current && !signInRef.current.contains(e.target as Node)) setShowSignInMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Shared: create a session and return its ID (or null on failure)
  const createSessionId = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to create room')
      const { id } = await res.json() as { id: string }
      localStorage.setItem(`pomodoro_host_${id}`, '1')
      return id
    } catch {
      toast('Could not create room. Please try again.', 'error')
      return null
    }
  }

  // CTA button: create + navigate with View Transition
  const handleCreateSession = async () => {
    setIsCreating(true)
    const id = await createSessionId()
    if (!id) { setIsCreating(false); return }
    if ('startViewTransition' in document) {
      ;(document as any).startViewTransition(() => router.push(`/session/${id}`))
    } else {
      router.push(`/session/${id}`)
    }
  }

  const handleCtaMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ctaBtnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.transition = 'transform 0.08s ease, box-shadow 0.08s ease'
    el.style.transform = `perspective(600px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) scale(1.04) translateZ(0)`
    el.style.boxShadow = `0 8px 32px rgba(232,71,42,0.5), 0 2px 8px rgba(232,71,42,0.25)`
  }

  const handleCtaMouseLeave = () => {
    const el = ctaBtnRef.current
    if (!el) return
    el.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease'
    el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0)'
    el.style.boxShadow = 'var(--shadow-md)'
  }

  useEffect(() => {
    return () => { rippleTimeoutsRef.current.forEach(clearTimeout) }
  }, [])

  const handleCtaClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setCtaRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
    const tid = setTimeout(() => {
      setCtaRipples(prev => prev.filter(r => r.id !== id))
      rippleTimeoutsRef.current = rippleTimeoutsRef.current.filter(t => t !== tid)
    }, 700)
    rippleTimeoutsRef.current.push(tid)
    handleCreateSession()
  }

  const handleSignIn = async (provider: 'github' | 'google') => {
    setIsSigningIn(true)
    setShowSignInMenu(false)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch {
      setIsSigningIn(false)
      toast('Sign-in failed. Please try again.', 'error')
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // sign-out failure is non-critical; session will expire naturally
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-5 sm:px-8 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Logo size="md" />

        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="text-sm font-medium transition-colors hidden sm:block"
            style={{ color: 'var(--text-secondary)' }}
          >
            Explore
          </Link>
          {user ? (
            <div className="relative flex items-center gap-2" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50"
                aria-label="User menu"
              >
                <Avatar
                  src={user.user_metadata?.avatar_url as string | undefined}
                  name={(user.user_metadata?.full_name as string | undefined) ?? user.email ?? '?'}
                  size="sm"
                />
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 top-10 w-52 rounded-2xl overflow-hidden z-50 animate-scale-in"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {user.user_metadata?.full_name as string ?? 'User'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                  </div>
                  <div className="py-1">
                    {[
                      ...(profileUsername ? [{
                        icon: UserCircle,
                        label: 'View Profile',
                        action: () => { setShowUserMenu(false); router.push(`/profile/${profileUsername}`) },
                      }] : []),
                      {
                        icon: LogOut,
                        label: 'Sign out',
                        action: () => { setShowUserMenu(false); void handleSignOut() },
                      },
                    ].map(({ icon: Icon, label, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors cursor-pointer"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative" ref={signInRef}>
              <button
                onClick={() => setShowSignInMenu(v => !v)}
                disabled={isSigningIn}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                Sign in
                <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>

              {showSignInMenu && (
                <div
                  className="absolute right-0 top-10 w-44 rounded-2xl overflow-hidden z-50 animate-scale-in"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <div className="py-1">
                    {[
                      { icon: <Github className="w-4 h-4" />, label: 'GitHub', provider: 'github' as const },
                      { icon: <GoogleIcon />, label: 'Google', provider: 'google' as const },
                    ].map(({ icon, label, provider }) => (
                      <button
                        key={provider}
                        onClick={() => handleSignIn(provider)}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors cursor-pointer"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-16 sm:py-24 text-center overflow-hidden">
        <div
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none blob-animate"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', opacity: 0.04, transform: 'translate(-30%, -30%)' }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none blob-animate"
          style={{ background: 'radial-gradient(circle, var(--green) 0%, transparent 70%)', opacity: 0.03, transform: 'translate(30%, 30%)', animationDelay: '-20s' }}
          aria-hidden="true"
        />

        <div className="relative max-w-2xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm mb-8 animate-fade-up"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: 'var(--accent)' }} />
            Real-time sync · No account required
          </div>

          <h1
            className="font-display font-bold text-[42px] sm:text-[72px] leading-[1.05] tracking-tight mb-5 animate-fade-up"
            style={{ color: 'var(--text-primary)', animationDelay: '80ms' }}
          >
            Focus together.
          </h1>

          <p
            className="text-lg sm:text-xl mb-10 sm:mb-12 max-w-lg mx-auto leading-relaxed animate-fade-up"
            style={{ color: 'var(--text-secondary)', animationDelay: '160ms' }}
          >
            A shared Pomodoro timer that keeps everyone in sync. Solo or with a team.
          </p>

          <div className="animate-fade-up flex flex-col items-center gap-3" style={{ animationDelay: '240ms' }}>
            <button
              ref={ctaBtnRef}
              onClick={handleCtaClick}
              onMouseMove={handleCtaMouseMove}
              onMouseLeave={handleCtaMouseLeave}
              disabled={isCreating}
              className="cta-btn relative overflow-hidden px-8 py-3.5 rounded-xl font-semibold text-base cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-md)', transformStyle: 'preserve-3d' }}
            >
              {/* Shimmer sweep on hover */}
              <span className="btn-shimmer" aria-hidden="true" />

              {/* Click ripples */}
              {ctaRipples.map(r => (
                <span
                  key={r.id}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: r.x,
                    top: r.y,
                    width: 10,
                    height: 10,
                    marginLeft: -5,
                    marginTop: -5,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.45)',
                    animation: 'btn-ripple 0.65s ease-out forwards',
                    pointerEvents: 'none',
                  }}
                />
              ))}

              <span className="relative flex items-center gap-2">
                {isCreating ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {isCreating ? 'Creating...' : 'Start a room now →'}
              </span>
            </button>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: activeSessionCount > 0 ? 'var(--green)' : 'var(--text-muted)' }} />
              {activeSessionCount > 0
                ? `${activeSessionCount} room${activeSessionCount !== 1 ? 's' : ''} live now. Join one →`
                : 'No live rooms yet. Start the first one.'}
            </Link>
          </div>
        </div>
      </section>

      {/* Live timer preview */}
      <TimerPreview onStartSession={createSessionId} />

      {/* Features */}
      <section className="px-5 sm:px-8 py-16 sm:py-24 max-w-5xl mx-auto w-full">
        <h2
          className="font-display font-bold text-2xl sm:text-3xl mb-12 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Built for focus. Built for teams.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-5 rounded-2xl transition-all duration-200"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'var(--shadow-md)'; el.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'var(--shadow-sm)'; el.style.borderColor = 'var(--border)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)' }}>
                <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <h3 className="font-semibold mb-1.5 text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mode comparison */}
      <ModesSection />

      {/* How it works */}
      <section className="px-5 sm:px-8 py-16 sm:py-24 w-full" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="font-display font-bold text-2xl sm:text-3xl mb-12 text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            Up and running in 30 seconds
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="relative flex flex-col animate-fade-up items-center text-center sm:items-start sm:text-left">
                <span
                  className="font-display font-bold text-[80px] sm:text-[100px] leading-none select-none mb-4"
                  style={{ color: 'var(--accent)', opacity: 0.15 }}
                >
                  {n}
                </span>
                <h3 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm"
        style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <Logo size="sm" />
        <div className="flex items-center gap-4 text-xs">
          <Link href="/privacy" style={{ color: 'var(--text-muted)' }}>Privacy</Link>
          <Link href="/terms" style={{ color: 'var(--text-muted)' }}>Terms</Link>
          <span>© {new Date().getFullYear()} PomodoroJam</span>
        </div>
        <a
          href="https://github.com/MinitJain/pomodoro-jam"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)' }}
        >
          <Github className="w-4 h-4" />
          GitHub
        </a>
      </footer>


    </div>
  )
}

export function LandingClient(props: LandingClientProps) {
  return (
    <ToastProvider>
      <LandingContent {...props} />
    </ToastProvider>
  )
}
