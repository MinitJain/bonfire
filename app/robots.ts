import type { MetadataRoute } from 'next'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bonfirefocus.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/og'],
      // /api/og stays crawlable: social platforms honour robots.txt when
      // fetching preview images. Rooms opt out of indexing via metadata.
      disallow: ['/api/', '/auth/'],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
