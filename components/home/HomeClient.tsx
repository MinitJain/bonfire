'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { ChevronDown, Shuffle, Globe, Lock, Github, LogOut, UserCircle } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Avatar } from '@/components/ui/Avatar'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { generateRoomName, generateAnonName } from '@/lib/roomName'

interface HomeClientProps {
  user: User | null
  profileUsername: string | null
  activeSessionCount: number
}

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

function HomeContent({ user, profileUsername, activeSessionCount }: HomeClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [roomName, setRoomName] = useState('')
  const [guestName, setGuestName] = useState('')
  const [isRoomPublic, setIsRoomPublic] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSignInMenu, setShowSignInMenu] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)
  const [btnPressed, setBtnPressed] = useState(false)
  const roomNameInputRef = useRef<HTMLInputElement>(null)
  const startBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const signInRef = useRef<HTMLDivElement>(null)

  function fireRipple(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = startBtnRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const el = document.createElement('span')
    el.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${x}px;top:${y}px;border-radius:50%;background:rgba(255,255,255,0.22);transform:scale(0);opacity:1;animation:btn-ripple 0.55s ease-out forwards;pointer-events:none;`
    btn.appendChild(el)
    el.addEventListener('animationend', () => el.remove())
  }


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

  const handleCreate = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const finalRoomName = roomName.trim() || generateRoomName()
      const finalGuestName = !user ? (guestName.trim() || generateAnonName()) : null
      if (finalRoomName !== roomName) setRoomName(finalRoomName)
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: finalRoomName, is_public: isRoomPublic, display_name: finalGuestName }),
      })
      if (!res.ok) throw new Error('Failed')
      const { id } = await res.json() as { id: string }
      if (finalGuestName) localStorage.setItem(`pomodoro_nick_${id}`, finalGuestName)
      localStorage.setItem(`pomodoro_host_${id}`, '1')
      const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
      if (doc.startViewTransition) {
        doc.startViewTransition(() => router.push(`/session/${id}`))
      } else {
        router.push(`/session/${id}`)
      }
    } catch {
      toast('Could not create room. Please try again.', 'error')
      setIsCreating(false)
    }
  }

  const handleSignIn = async (provider: 'github' | 'google') => {
    setIsSigningIn(true)
    setShowSignInMenu(false)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
      })
      if (error) throw error
    } catch {
      setIsSigningIn(false)
      toast('Sign-in failed. Please try again.', 'error')
    }
  }

  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } catch { /* non-critical */ }
    router.refresh()
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 sm:px-8 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Logo size="md" />

        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Explore
          </Link>

          {user && profileUsername && (
            <Link
              href={`/profile/${profileUsername}`}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Profile
            </Link>
          )}

          {user ? (
            <div className="relative" ref={menuRef}>
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
                      {typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : 'User'}
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
      </header>

      {/* Main: create room form centred */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm flex flex-col gap-5 animate-scale-in">
          <div className="text-center">
            <h1
              className="font-display font-bold text-2xl sm:text-3xl mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Start a focus room
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Solo or with a team. Share the link and focus in sync.
            </p>
          </div>

          {/* Room name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Room name
            </label>
          <div className="relative">
            <input
              ref={roomNameInputRef}
              type="text"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleCreate() }}
              maxLength={100}
              placeholder="Enter your room name"
              className="w-full pl-4 pr-11 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              autoComplete="off"
              autoFocus
            />
            <button
              type="button"
              onClick={() => { setRoomName(generateRoomName()); roomNameInputRef.current?.select() }}
              aria-label="Generate random name"
              title="Roll a random name"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>
          </div>

          {/* Your name (anonymous users only) */}
          {!user && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Your name
              </label>
              <input
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleCreate() }}
                maxLength={40}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                autoComplete="off"
              />
            </div>
          )}

          {/* Public / Private toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={isRoomPublic}
            aria-label="Room visibility"
            onClick={() => setIsRoomPublic(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors cursor-pointer"
            style={{
              background: 'var(--bg-secondary)',
              border: `1px solid ${isRoomPublic ? 'var(--border)' : 'rgba(139,92,246,0.4)'}`,
            }}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                {isRoomPublic ? <Globe size={14} /> : <Lock size={14} />}
                {isRoomPublic ? 'Public room' : 'Private room'}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isRoomPublic ? 'Visible on Explore' : 'Link-only, locked on Explore'}
              </span>
            </div>
            <div
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: isRoomPublic ? 'var(--border)' : 'rgba(139,92,246,0.6)' }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ left: isRoomPublic ? '4px' : '23px' }}
              />
            </div>
          </button>

          {/* CTA */}
          <button
            ref={startBtnRef}
            onClick={(e) => { fireRipple(e); void handleCreate() }}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => { setBtnHovered(false); setBtnPressed(false) }}
            onMouseDown={() => setBtnPressed(true)}
            onMouseUp={() => setBtnPressed(false)}
            disabled={isCreating}
            className="relative overflow-hidden w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: btnPressed
                ? '0 2px 8px rgba(255,85,51,0.25)'
                : btnHovered
                  ? '0 8px 30px rgba(255,85,51,0.5)'
                  : 'var(--shadow-md)',
              transform: btnPressed ? 'scale(0.97)' : btnHovered ? 'scale(1.02) translateY(-1px)' : 'scale(1)',
              transition: 'transform 0.14s ease, box-shadow 0.14s ease',
            }}
          >
            {isCreating && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isCreating ? 'Creating...' : 'Start Room'}
          </button>

          {/* Live rooms link */}
          <Link
            href="/explore"
            className="text-center text-sm transition-colors flex items-center justify-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: activeSessionCount > 0 ? 'var(--green)' : 'var(--text-muted)' }}
            />
            {activeSessionCount > 0
              ? `${activeSessionCount} room${activeSessionCount !== 1 ? 's' : ''} live now. Join one →`
              : 'No live rooms yet. Start the first one.'}
          </Link>
        </div>
      </main>
    </div>
  )
}

export function HomeClient(props: HomeClientProps) {
  return (
    <ToastProvider>
      <HomeContent {...props} />
    </ToastProvider>
  )
}
