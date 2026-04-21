import type { Metadata, Viewport } from 'next'
import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { FaviconInit } from '@/components/ui/FaviconInit'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bonfirefocus.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Bonfire: Focus Together',
    template: '%s | Bonfire',
  },
  description:
    'A shared focus timer for friends. Start a room, share the link, focus in sync.',
  keywords: ['pomodoro', 'focus', 'productivity', 'timer', 'shared', 'real-time'],
  authors: [{ name: 'Bonfire' }],
  creator: 'Bonfire',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    siteName: 'Bonfire',
    title: 'Bonfire: Focus Together',
    description: 'Real-time shared Pomodoro timer. Focus with friends.',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Bonfire',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bonfire: Focus Together',
    description: 'Real-time shared Pomodoro timer. Focus with friends.',
    images: ['/api/og'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    statusBarStyle: 'black-translucent',
    title: 'Bonfire',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: appUrl,
  },
  other: {
    'mobile-web-app-capable': 'yes',
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
      className={`${dmSans.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
<body className="bg-background text-foreground font-sans min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: 'Bonfire',
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
