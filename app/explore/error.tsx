'use client'
import { TriangleAlert } from 'lucide-react'

export default function ExploreError({ error: _error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-6 text-center" style={{ background: 'var(--bg-primary)' }}>
      <TriangleAlert className="w-12 h-12 mb-6" style={{ color: 'var(--accent)' }} />
      <h1 className="font-display font-bold text-2xl mb-3" style={{ color: 'var(--text-primary)' }}>Something went wrong</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>We couldn&apos;t load live rooms. Please try again.</p>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Try again
      </button>
    </div>
  )
}
