'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <p
        className="text-lg font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        Something went wrong
      </p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link href="/">
          <Button variant="ghost">Go home</Button>
        </Link>
      </div>
    </div>
  )
}
