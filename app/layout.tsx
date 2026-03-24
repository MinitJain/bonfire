import type { Metadata, Viewport } from 'next'
import { DM_Sans, Syne, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Analytics } from '@vercel/analytics/next'
import { FaviconInit } from '@/components/ui/FaviconInit'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pomodoro-jam.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'PomodoroJam: Focus Together',
    template: '%s | PomodoroJam',
  },
  description:
    'A shared Pomodoro timer for friends. Start a session, share the link, focus in sync.',
  keywords: ['pomodoro', 'focus', 'productivity', 'timer', 'shared', 'real-time'],
  authors: [{ name: 'PomodoroJam' }],
  creator: 'PomodoroJam',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    siteName: 'PomodoroJam',
    title: 'PomodoroJam: Focus Together',
    description: 'Real-time shared Pomodoro timer. Focus with friends.',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'PomodoroJam',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PomodoroJam: Focus Together',
    description: 'Real-time shared Pomodoro timer. Focus with friends.',
    images: ['/api/og'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PomodoroJam',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: appUrl,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF7' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0F0D' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${syne.variable} ${jetbrainsMono.variable}`}
    >
<body className="bg-background text-foreground font-sans min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: 'PomodoroJam',
                url: appUrl,
                description: 'A shared Pomodoro timer for friends. Start a session, share the link, focus in sync.',
                applicationCategory: 'ProductivityApplication',
                operatingSystem: 'Any',
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'USD',
                },
              }),
            }}
          />
          <FaviconInit />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
