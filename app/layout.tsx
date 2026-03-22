import type { Metadata, Viewport } from 'next'
import { DM_Sans, Syne, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
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
    default: 'PomodoroJam — Focus Together',
    template: '%s | PomodoroJam',
  },
  description:
    'Real-time shared Pomodoro timer. One host, many watchers, perfect sync. Focus together.',
  keywords: ['pomodoro', 'focus', 'productivity', 'timer', 'shared', 'real-time'],
  authors: [{ name: 'PomodoroJam' }],
  creator: 'PomodoroJam',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    siteName: 'PomodoroJam',
    title: 'PomodoroJam — Focus Together',
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
    title: 'PomodoroJam — Focus Together',
    description: 'Real-time shared Pomodoro timer. Focus with friends.',
    images: ['/api/og'],
  },
  manifest: '/manifest.json',
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
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-background text-foreground font-sans min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
