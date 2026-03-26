'use client'
import Link from 'next/link'

export default function ExploreError() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-6 text-center" style={{ background: 'var(--bg-primary)' }}>
      <p className="text-5xl mb-6">😔</p>
      <h1 className="font-display font-bold text-2xl mb-3" style={{ color: 'var(--text-primary)' }}>Something went wrong</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>We couldn&apos;t load live sessions. Please try again.</p>
      <Link href="/explore" className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
        Try again
      </Link>
    </div>
  )
}
