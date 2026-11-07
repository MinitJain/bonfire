import type { Metadata } from 'next'

// The page itself is a client component, so its metadata lives here
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Optional sign-in for Bonfire. Keep your name and focus stats across devices.',
  robots: { index: false, follow: true },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
