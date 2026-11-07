'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const GitHubIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

function LoginContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const supabase = useMemo(() => createClient(), [])

  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null)

  const handleOAuth = async (provider: 'github' | 'google') => {
    setOauthLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) setOauthLoading(null)
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setEmailLoading(true)
    setEmailError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    setEmailLoading(false)
    if (error) {
      setEmailError(error.message)
    } else {
      setEmailSent(true)
    }
  }

  return (
    <div className="bf-home">
      <div className="bf-corner bf-corner-left">
        <Link href="/" className="bf-wordmark-sm">Bonfire</Link>
      </div>
      <div className="bf-home-corner">
        <ThemeToggle variant="quiet" />
      </div>

      <main className="bf-login">
        {emailSent ? (
          /* ── Confirmation state ── */
          <div className="bf-login-col animate-scale-in" style={{ alignItems: 'center', textAlign: 'center' }}>
            <Mail className="w-10 h-10" style={{ color: 'var(--accent-strong)' }} aria-hidden="true" />
            <h1 className="bf-login-title">Check your inbox</h1>
            <p className="bf-login-sub">
              We sent a sign-in link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Click it to continue.
            </p>
            <button
              type="button"
              onClick={() => { setEmailSent(false); setEmail('') }}
              className="bf-text-btn"
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* ── Sign-in form ── */
          <div className="bf-login-col animate-scale-in">
            <div>
              <h1 className="bf-login-title">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="bf-login-sub">
                {mode === 'signup' ? 'Keep your focus stats across devices.' : 'Sign in to continue your focus sessions.'}
              </p>
            </div>

            {/* OAuth buttons */}
            {([
              { provider: 'google' as const, label: 'Continue with Google', icon: <GoogleIcon /> },
              { provider: 'github' as const, label: 'Continue with GitHub', icon: <GitHubIcon /> },
            ]).map(({ provider, label, icon }) => (
              <button
                key={provider}
                type="button"
                onClick={() => void handleOAuth(provider)}
                disabled={!!oauthLoading}
                className="bf-btn-secondary w-full"
              >
                {oauthLoading === provider ? (
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : icon}
                {label}
              </button>
            ))}

            <p className="bf-login-or">or continue with email</p>

            {/* Email form */}
            <form onSubmit={e => void handleEmail(e)} className="bf-login-col">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bf-login-email" className="bf-pop-label" style={{ marginBottom: 0 }}>
                  Email address
                </label>
                <input
                  id="bf-login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className={emailError ? 'bf-input bf-login-input is-error' : 'bf-input bf-login-input'}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? 'bf-login-error' : undefined}
                  autoComplete="email"
                />
                {emailError && (
                  <p id="bf-login-error" className="text-xs" style={{ color: 'var(--danger)' }}>{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={emailLoading || !email.trim()}
                className="bf-btn-primary w-full"
              >
                {emailLoading && (
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                )}
                Continue
              </button>
            </form>

            <p className="bf-login-switch">
              {mode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setEmail(''); setEmailError('') }}
                    className="bf-login-link"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setEmail(''); setEmailError('') }}
                    className="bf-login-link"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
