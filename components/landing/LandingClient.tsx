'use client'

import { useState, useTransition, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { Users, Zap, Github, LogOut, UserCircle, Timer, Bell, BarChart2, Link2, X, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { extractSessionId } from '@/lib/session'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface LandingClientProps {
  user: User | null
  profileUsername: string | null
}

const features = [
  {
    icon: Zap,
    title: 'Like a listening party, but for work',
    desc: 'One host controls the timer. Or enable Jam Mode and let everyone drive.',
  },
  {
    icon: Users,
    title: 'Host controls. Watchers sync.',
    desc: 'Clock-based sync keeps every participant on the same second, always.',
  },
  {
    icon: Bell,
    title: 'Break notifications',
    desc: "Browser notifications alert every participant when it's time to rest.",
  },
  {
    icon: BarChart2,
    title: 'Profiles and streaks',
    desc: 'Track your focus hours, daily streaks, and pomodoro count over time.',
  },
  {
    icon: Link2,
    title: 'Share in one tap',
    desc: 'Copy the link and send it anywhere. Friends join instantly.',
  },
  {
    icon: Timer,
    title: 'No account needed',
    desc: "Start a session as a guest. Sign in only when you're ready for stats.",
  },
]

const steps = [
  { n: '01', title: 'Start a session', desc: 'Hit the button. A unique session link is generated instantly.' },
  { n: '02', title: 'Share the link', desc: 'Send it to your friends via any platform. They join in seconds.' },
  { n: '03', title: 'Focus together', desc: 'One timer, everyone in sync. When the host starts, everyone starts.' },
]

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

function StartModal({
  onClose,
  onHost,
  isCreating,
}: {
  onClose: () => void
  onHost: () => void
  isCreating: boolean
}) {
  const router = useRouter()
  const [joinInput, setJoinInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [isPending, startTransition] = useTransition()
  const modalRef = useRef<HTMLDivElement>(null)

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Focus trap + restore focus on close
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const first = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !modalRef.current) return
      const els = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!els.length) return
      const firstEl = els[0]
      const lastEl = els[els.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      } else {
        if (document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => {
      document.removeEventListener('keydown', handleTab)
      previous?.focus()
    }
  }, [])

  const handleJoin = () => {
    setJoinError('')
    const sessionId = extractSessionId(joinInput)
    if (!sessionId) {
      setJoinError('Enter a valid session link or ID')
      return
    }
    startTransition(() => { router.push(`/session/${sessionId}`) })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(15,15,13,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Start or join a session"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 animate-scale-in relative"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <h2
          className="font-display font-bold text-xl mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          What do you want to do?
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Start a new session or join a friend&apos;s.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Host card */}
          <div
            className="flex flex-col p-5 rounded-2xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'var(--accent-soft)' }}
            >
              <Zap className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              Host a session
            </h3>
            <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
              Create a timer and invite friends. You can switch between Host and Jam mode once inside.
            </p>

            <button
              onClick={onHost}
              disabled={isCreating}
              className="mt-auto w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer disabled:opacity-70"
              style={{ background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-sm)' }}
            >
              {isCreating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                'Start session →'
              )}
            </button>
          </div>

          {/* Join card */}
          <div
            className="flex flex-col p-5 rounded-2xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <Users className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              Join a session
            </h3>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Paste a session link or ID to join a friend&apos;s session.
            </p>
            <input
              type="text"
              placeholder="Paste link or session ID"
              value={joinInput}
              onChange={e => { setJoinInput(e.target.value); setJoinError('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              className={cn(
                'w-full px-3 py-2 rounded-xl text-sm outline-none transition-all mb-2',
                joinError && 'ring-2 ring-red-500/50'
              )}
              style={{
                background: 'var(--bg-elevated)',
                border: `1px solid ${joinError ? '#ef4444' : 'var(--border)'}`,
                color: 'var(--text-primary)',
              }}
            />
            {joinError && <p className="text-xs text-red-400 mb-2">{joinError}</p>}
            <button
              onClick={handleJoin}
              disabled={!joinInput.trim() || isPending}
              className="mt-auto w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer disabled:opacity-50"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              Join session →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingContent({ user, profileUsername }: LandingClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
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

  const handleCreateSession = async () => {
    setIsCreating(true)
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to create session')
      const { id } = await res.json() as { id: string }
      localStorage.setItem(`pomodoro_host_${id}`, '1')
      router.push(`/session/${id}`)
    } catch {
      setIsCreating(false)
      toast('Could not create session. Please try again.', 'error')
    }
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
            Start a 25-minute focus timer. Share the link. Your friends focus in sync and break together.
          </p>

          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-150 cursor-pointer"
              style={{ background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Start a session
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 sm:px-8 py-16 sm:py-24 max-w-5xl mx-auto w-full">
        <h2
          className="font-display font-bold text-2xl sm:text-3xl mb-12 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Everything you and your friends need to focus
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
              <div key={n} className="relative flex flex-col animate-fade-up">
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

      {/* Start modal */}
      {showModal && (
        <StartModal
          onClose={() => setShowModal(false)}
          onHost={handleCreateSession}
          isCreating={isCreating}
        />
      )}
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
