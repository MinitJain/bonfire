import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <p
        className="text-lg font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        Bonfire not found
      </p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        This bonfire may have ended or the link is incorrect.
      </p>
      <Link href="/">
        <Button variant="primary">Light a new Bonfire</Button>
      </Link>
    </div>
  )
}
