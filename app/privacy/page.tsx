import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for PomodoroJam',
}

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="flex items-center px-5 sm:px-8 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/"><Logo size="md" /></Link>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-8 py-12">
        <h1 className="font-display font-bold text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>Last updated: March 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>What we collect</h2>
            <p>When you sign in with GitHub or Google, we store your name, email, and avatar URL to create your profile. We also store the focus sessions you participate in and your pomodoro statistics.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>How we use it</h2>
            <p>Your data is used solely to provide the PomodoroJam service — displaying your profile, tracking your focus stats, and enabling real-time session sync. We do not sell your data or use it for advertising.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Third parties</h2>
            <p>We use Supabase for authentication and data storage, and Vercel for hosting. Both are SOC 2 compliant. Analytics are provided by Vercel Analytics (privacy-friendly, no cookies).</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Your rights</h2>
            <p>You can delete your account at any time by contacting us. Guest sessions (no sign-in) are not linked to any identity and expire automatically.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Contact</h2>
            <p>Questions? Open an issue on our <a href="https://github.com/MinitJain/pomodoro-jam" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>GitHub repository</a>.</p>
          </section>
        </div>
      </main>
      <footer className="px-5 sm:px-8 py-5 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--accent)' }}>← Back to PomodoroJam</Link>
      </footer>
    </div>
  )
}
