import type { Metadata } from 'next'
import { PolicyPageLayout } from '@/components/ui/PolicyPageLayout'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for PomodoroJam',
}

export default function TermsPage() {
  return (
    <PolicyPageLayout title="Terms of Service" lastUpdated="March 2026">
      <section>
        <h2 className="font-semibold text-base mb-2 text-[var(--text-primary)]">Use of service</h2>
        <p>PomodoroJam is a free productivity tool. You may use it for personal or professional focus sessions. You agree not to abuse the service, create sessions for malicious purposes, or attempt to reverse-engineer the platform.</p>
      </section>
      <section>
        <h2 className="font-semibold text-base mb-2 text-[var(--text-primary)]">No warranty</h2>
        <p>PomodoroJam is provided &quot;as is&quot; without warranty of any kind. We make no guarantees about uptime or data retention. Session data may be deleted after 7 days of inactivity.</p>
      </section>
      <section>
        <h2 className="font-semibold text-base mb-2 text-[var(--text-primary)]">Accounts</h2>
        <p>You are responsible for maintaining the security of your account. We reserve the right to suspend accounts that violate these terms.</p>
      </section>
      <section>
        <h2 className="font-semibold text-base mb-2 text-[var(--text-primary)]">Changes</h2>
        <p>We may update these terms at any time. Continued use of PomodoroJam after changes constitutes acceptance.</p>
      </section>
    </PolicyPageLayout>
  )
}
