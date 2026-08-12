import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Belt-and-braces: lib/content.ts reads these at build time, but if a route
  // ever becomes dynamic, the JSON must be traced into the lambda bundle.
  outputFileTracingIncludes: {
    '/api/**/*': ['./public/data/*.json'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    // Trimmed from 8 defaults to 4 to hold down Vercel transformation count
    // (531 source images x sizes x formats).
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [96, 256],
    qualities: [70, 75],
  },

  async redirects() {
    return [
      // The old SPA used /products?search=q; search now has its own route.
      {
        source: '/products',
        has: [{ type: 'query', key: 'search', value: '(?<q>.*)' }],
        destination: '/search?q=:q',
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        // Product images are content-addressed by directory and never mutate
        // in place; build-data.mjs rewrites paths when they change.
        source: '/data/products/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
