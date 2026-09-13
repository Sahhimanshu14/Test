import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/cds',
          '/cds-*',
          '/practice',
          '/pyq',
          '/tests',
          '/about',
          '/contact',
          '/privacy',
          '/terms',
          '/cookie-policy',
          '/refund-policy',
          '/subscription-terms',
          '/login',
          '/register',
        ],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/admin',
          '/admin/*',
          '/analytics',
          '/analytics/*',
          '/result',
          '/result/*',
          '/profile',
          '/profile/*',
          '/settings',
          '/settings/*',
          '/bookmarks',
          '/bookmarks/*',
          '/mistakes',
          '/mistakes/*',
          '/notifications',
          '/notifications/*',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
