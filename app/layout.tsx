import type { Metadata, Viewport } from 'next'
import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { FaviconInit } from '@/components/ui/FaviconInit'
import { BRAND } from '@/lib/brand'
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
    default: 'Bonfire',
    template: '%s | Bonfire',
  },
  description: BRAND.tagline,
  keywords: ['pomodoro', 'focus', 'productivity', 'timer', 'shared', 'real-time'],
  authors: [{ name: 'Bonfire' }],
  creator: 'Bonfire',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    siteName: 'Bonfire',
    title: 'Bonfire',
    description: BRAND.tagline,
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
    title: 'Bonfire',
    description: BRAND.tagline,
    images: ['/api/og'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    statusBarStyle: 'default',
    title: 'Bonfire',
  },
  icons: {
    // Declared explicitly: defining `icons` here replaces Next's automatic app/icon.svg link
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
    ],
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
    { media: '(prefers-color-scheme: light)', color: '#EDF2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#141C28' },
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
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
          `}</Script>
        </>
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
