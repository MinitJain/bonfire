import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

interface PolicyPageLayoutProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export function PolicyPageLayout({ title, lastUpdated, children }: PolicyPageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)]">
      <header className="flex items-center px-5 sm:px-8 py-4 border-b border-[var(--border)]">
        <Link href="/"><Logo size="md" /></Link>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-8 py-12">
        <h1 className="font-display font-bold text-3xl mb-2 text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="text-sm mb-10 text-[var(--text-muted)]">Last updated: {lastUpdated}</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
      </main>

      <footer className="px-5 sm:px-8 py-5 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
        <Link href="/" className="text-[var(--accent)]">← Back to PomodoroJam</Link>
      </footer>
    </div>
  )
}
