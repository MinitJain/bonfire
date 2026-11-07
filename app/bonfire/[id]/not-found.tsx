import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <h1
        className="text-lg font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        Bonfire not found
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        This bonfire may have ended or the link is incorrect.
      </p>
      <Link href="/" className="bf-btn-primary">
        Light a new Bonfire
      </Link>
    </div>
  )
}
