import Link from 'next/link'
import { Timer } from 'lucide-react'

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
      <Link
        href="/"
        className="inline-flex items-center justify-center px-4 py-2 text-sm rounded-xl min-h-[40px] bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white font-semibold shadow-md transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50"
      >
        Start a New Session
      </Link>
    </div>
  )
}
