import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for PomodoroJam',
}

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="flex items-center px-5 sm:px-8 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/"><Logo size="md" /></Link>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-8 py-12">
        <h1 className="font-display font-bold text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Terms of Service</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>Last updated: March 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Use of service</h2>
            <p>PomodoroJam is a free productivity tool. You may use it for personal or professional focus sessions. You agree not to abuse the service, create sessions for malicious purposes, or attempt to reverse-engineer the platform.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>No warranty</h2>
            <p>PomodoroJam is provided &quot;as is&quot; without warranty of any kind. We make no guarantees about uptime or data retention. Session data may be deleted after 7 days of inactivity.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Accounts</h2>
            <p>You are responsible for maintaining the security of your account. We reserve the right to suspend accounts that violate these terms.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Changes</h2>
            <p>We may update these terms at any time. Continued use of PomodoroJam after changes constitutes acceptance.</p>
          </section>
        </div>
      </main>
      <footer className="px-5 sm:px-8 py-5 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--accent)' }}>← Back to PomodoroJam</Link>
      </footer>
    </div>
  )
}
