/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'
// Dev only: allow a local Supabase stack (`supabase start`), which is not on *.supabase.co.
const devSupabase = isDev && process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ''
const devConnect = devSupabase ? ` ${devSupabase} ${devSupabase.replace(/^http/, 'ws')}` : ''
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} va.vercel-scripts.com www.googletagmanager.com; style-src 'self' 'unsafe-inline'; connect-src 'self' *.supabase.co wss://*.supabase.co${devConnect} vitals.vercel-insights.com www.google-analytics.com region1.google-analytics.com; img-src 'self' data: blob: *.supabase.co${devSupabase ? ` ${devSupabase}` : ''} *.githubusercontent.com lh3.googleusercontent.com www.googletagmanager.com; font-src 'self' data: fonts.gstatic.com fonts.googleapis.com;` },
        ],
      },
    ]
  },
}

module.exports = nextConfig
