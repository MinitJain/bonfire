import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">🔐</p>
        <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
          Sign-in failed
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Something went wrong during sign-in. Please try again.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
