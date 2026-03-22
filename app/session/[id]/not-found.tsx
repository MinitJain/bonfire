import Link from 'next/link'
import { Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function SessionNotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-6">
        <Timer className="w-8 h-8 text-muted" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Session Not Found</h1>
      <p className="text-muted mb-8 max-w-sm">
        This session doesn&apos;t exist or has expired. Start a new one!
      </p>
      <Link href="/">
        <Button variant="primary">Start a New Session</Button>
      </Link>
    </div>
  )
}
