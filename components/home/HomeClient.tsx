'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { ArrowRight, Github, LogOut, UserCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Avatar } from '@/components/ui/Avatar'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { HomeObjects } from '@/components/home/HomeObjects'
import { FocusSetup } from '@/components/home/FocusSetup'
import { useToday } from '@/hooks/useToday'
import { createClient } from '@/lib/supabase/client'
import { BRAND } from '@/lib/brand'
import {
  createBonfire,
  getStoredSetup,
  getSuggestedName,
  isValidJoinCode,
  resolveJoinCode,
  restsFor,
  storeInitiatorToken,
  storeSetup,
  DEFAULT_SETUP,
  type HomeSetup,
} from '@/lib/bonfire'

interface HomeClientProps {
  user: User | null
  profileUsername: string | null
  /** Signed-in only: pomodoros completed across all Bonfires. */
  totalPomodoros: number | null
}

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

function HomeContent({ user, profileUsername, totalPomodoros }: HomeClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [joining, setJoining] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [menu, setMenu] = useState<'user' | 'signin' | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const [setup, setSetup] = useState<HomeSetup>(DEFAULT_SETUP)
  const today = useToday({ userId: user?.id ?? null })

  // The last setup is read after mount, so the server render stays stable
  useEffect(() => setSetup(getStoredSetup()), [])

  const changeSetup = (next: HomeSetup) => {
    setSetup(next)
    storeSetup(next)
  }

  useEffect(() => {
    if (!menu) return
    function onPointer(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [menu])

  useEffect(() => {
    if (joining) codeRef.current?.focus()
  }, [joining])

  const userName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null

  const handleCreate = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const initiatorName = userName ?? getSuggestedName()
      const rests = restsFor(setup.focus)
      const result = await createBonfire({
        initiatorName,
        focusDuration: setup.focus * 60,
        shortDuration: rests.short * 60,
        longDuration: rests.long * 60,
        roundsBeforeLong: setup.rounds,
      })
      if (result.error || !result.data) throw new Error(result.error ?? 'Failed to create bonfire')
      storeInitiatorToken(result.data.id, result.data.initiator_token)
      router.push(`/bonfire/${result.data.id}`)
    } catch {
      toast('Could not light a bonfire. Please try again.', 'error')
      setIsCreating(false)
    }
  }

  const handleJoin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!isValidJoinCode(code)) {
      toast('That code should be 6 letters and numbers.', 'error')
      return
    }
    if (isResolving) return
    setIsResolving(true)
    try {
      const result = await resolveJoinCode(code)
      if (result.error || !result.data) throw new Error(result.error ?? 'Bonfire not found')
      router.push(`/bonfire/${result.data.id}`)
    } catch (err) {
      const msg = err instanceof Error && /ended/i.test(err.message)
        ? 'That bonfire has already settled.'
        : 'No bonfire with that code.'
      toast(msg, 'error')
      setIsResolving(false)
    }
  }

  const handleSignIn = async (provider: 'github' | 'google') => {
    setIsSigningIn(true)
    setMenu(null)
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
    <div className="bf-home">
      <HomeObjects />

      <div className="bf-home-corner" ref={menuRef}>
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu(m => (m === 'user' ? null : 'user'))}
              className="bf-icon-btn"
              aria-label="Account"
              aria-expanded={menu === 'user'}
            >
              <Avatar
                src={user.user_metadata?.avatar_url as string | undefined}
                name={userName ?? user.email ?? '?'}
                size="sm"
              />
            </button>
            {menu === 'user' && (
              <div className="bf-popover" style={{ padding: 6, width: 220 }}>
                <div className="px-3 py-2">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{userName ?? 'Signed in'}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                  {totalPomodoros !== null && totalPomodoros > 0 && (
                    <p className="bf-pop-hint" style={{ marginTop: 8 }}>
                      {totalPomodoros} {totalPomodoros === 1 ? 'pomodoro' : 'pomodoros'} finished by the fire
                    </p>
                  )}
                </div>
                {profileUsername && (
                  <button
                    type="button"
                    className="bf-text-btn w-full flex items-center gap-2"
                    style={{ justifyContent: 'flex-start', borderRadius: 10 }}
                    onClick={() => { setMenu(null); router.push(`/profile/${profileUsername}`) }}
                  >
                    <UserCircle className="w-4 h-4" /> Profile
                  </button>
                )}
                <button
                  type="button"
                  className="bf-text-btn w-full flex items-center gap-2"
                  style={{ justifyContent: 'flex-start', borderRadius: 10 }}
                  onClick={() => { setMenu(null); void handleSignOut() }}
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              className="bf-text-btn"
              disabled={isSigningIn}
              onClick={() => setMenu(m => (m === 'signin' ? null : 'signin'))}
              aria-expanded={menu === 'signin'}
            >
              sign in
            </button>
            {menu === 'signin' && (
              <div className="bf-popover" style={{ padding: 6, width: 200 }}>
                <button
                  type="button"
                  className="bf-text-btn w-full flex items-center gap-2"
                  style={{ justifyContent: 'flex-start', borderRadius: 10 }}
                  onClick={() => void handleSignIn('github')}
                >
                  <Github className="w-4 h-4" /> GitHub
                </button>
                <button
                  type="button"
                  className="bf-text-btn w-full flex items-center gap-2"
                  style={{ justifyContent: 'flex-start', borderRadius: 10 }}
                  onClick={() => void handleSignIn('google')}
                >
                  <GoogleIcon /> Google
                </button>
                <p className="bf-pop-hint px-3 pb-1">Optional. Keeps your name and focus stats.</p>
              </div>
            )}
          </div>
        )}
        <ThemeToggle variant="quiet" />
      </div>

      <main className="bf-home-main">
        <h1 className="bf-home-wordmark">BONFIRE</h1>
        <p className="bf-home-tagline">{BRAND.tagline.toLowerCase()}</p>
        {today && today.pomodoros > 0 && (
          <p className="bf-home-today">
            {today.pomodoros} {today.pomodoros === 1 ? 'pomodoro' : 'pomodoros'} today
          </p>
        )}

        <div className="bf-home-spacer" />

        <div className="bf-home-lower">
          <FocusSetup
            setup={setup}
            onChange={changeSetup}
            onSubmit={() => void handleCreate()}
            dimmed={joining}
          />

          <div className="bf-home-actions">
            <button
              type="button"
              className="bf-btn-primary"
              onClick={() => void handleCreate()}
              disabled={isCreating}
            >
              {isCreating ? 'lighting…' : 'start a bonfire'}
            </button>

            {joining ? (
              <form className="bf-code-field" onSubmit={handleJoin}>
                <input
                  ref={codeRef}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6))}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setJoining(false)
                      setJoinCode('')
                    }
                  }}
                  onBlur={() => { if (!joinCode) setJoining(false) }}
                  placeholder="6-letter code"
                  aria-label="Join code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={6}
                />
                <button
                  type="submit"
                  className="bf-code-submit"
                  aria-label="Join"
                  disabled={joinCode.length < 6 || isResolving}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button type="button" className="bf-btn-secondary" onClick={() => setJoining(true)}>
                join a bonfire
              </button>
            )}
          </div>
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
