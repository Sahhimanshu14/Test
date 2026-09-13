/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.STANDALONE === 'true' || process.env.DOCKER === 'true' ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  compress: true,
  transpilePackages: ['@cdsprep/ui', '@cdsprep/types', '@cdsprep/validation'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@cdsprep/ui', 'recharts'],
  },
  poweredByHeader: false, // Disables X-Powered-By: Next.js to reduce information leakage
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  async rewrites() {
    let apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    apiUrl = apiUrl.replace(/\/+$/, '');
    if (!apiUrl.endsWith('/api/v1')) {
      apiUrl = `${apiUrl}/api/v1`;
    }
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
