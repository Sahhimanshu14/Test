import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain';
  const lastModified = new Date();

  const publicRoutes = [
    { url: '', priority: 1.0, changeFrequency: 'daily' as const },
    { url: '/cds', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/cds-preparation', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/cds-maths', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/cds-english', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/cds-gk', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/cds-pyq', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/cds-mock-tests', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/practice', priority: 0.8, changeFrequency: 'daily' as const },
    { url: '/pyq', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/tests', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/contact', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/privacy', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/terms', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/cookie-policy', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/refund-policy', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/subscription-terms', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/login', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/register', priority: 0.7, changeFrequency: 'monthly' as const },
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
