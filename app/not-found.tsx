import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="flex flex-col min-h-screen items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Simple CSS tomato illustration */}
      <div className="mb-8 select-none" style={{ fontSize: '72px', lineHeight: 1 }}>🍅</div>
      <h1
        className="font-display font-bold text-3xl mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        This room doesn&apos;t exist
      </h1>
      <p className="text-base mb-8 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        The session link may have expired or the ID is incorrect.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl text-sm font-medium transition-all"
        style={{ background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
      >
        Start a new session
      </Link>
    </div>
  )
}
