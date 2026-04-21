import type { Metadata } from 'next'
import { PolicyPageLayout } from '@/components/ui/PolicyPageLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Bonfire',
}

export default function PrivacyPage() {
  return (
    <PolicyPageLayout title="Privacy Policy" lastUpdated="April 2026">
      <section>
        <h2 className="font-semibold text-base mb-2 text-[var(--text-primary)]">What we collect</h2>
        <p>When you sign in with GitHub or Google, we store your name, email, and avatar URL to create your profile. We also store the focus sessions you participate in and your pomodoro statistics.</p>
      </section>
      <section>
        <h2 className="font-semibold text-base mb-2 text-[var(--text-primary)]">How we use it</h2>
        <p>Your data is used solely to provide the Bonfire service: displaying your profile, tracking your focus stats, and enabling real-time session sync. We do not sell your data or use it for advertising.</p>
      </section>
      <section>
        <h2 className="font-semibold text-base mb-2 text-[var(--text-primary)]">Third parties</h2>
        <p>We use Supabase for authentication and data storage, and Vercel for hosting. Both are SOC 2 compliant. We use Vercel Analytics (no cookies) and Google Analytics 4 for usage metrics. Google Analytics sets cookies (_ga, _ga_*) and transmits anonymized usage data to Google. You can opt out via <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)]">Google&apos;s opt-out tool</a>.</p>
      </section>
      <section>
        <h2 className="font-semibold text-base mb-2 text-[var(--text-primary)]">Your rights</h2>
        <p>You can delete your account at any time by contacting us. Guest sessions (no sign-in) are not linked to any identity and expire automatically.</p>
      </section>
      <section>
        <h2 className="font-semibold text-base mb-2 text-[var(--text-primary)]">Contact</h2>
        <p>Questions? Open an issue on our <a href="https://github.com/MinitJain/pomodoro-jam" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)]">GitHub repository</a>.</p>
      </section>
    </PolicyPageLayout>
  )
}
