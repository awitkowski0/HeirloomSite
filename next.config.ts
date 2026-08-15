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
      {
        /*
         * /gallery is retired: it showed six of the sixteen cribs - the ones
         * the supplier feed encoded as wood variants - under a nav label that
         * also named /products. Its finish browser now lives on the cribs
         * category page, showing all of them. Permanent, because the URL was
         * in the sitemap.
         */
        source: '/gallery',
        destination: '/products/cribs',
        permanent: true,
      },
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
    /*
     * The site had no security headers of any kind: no CSP, no HSTS, no
     * nosniff, no Referrer-Policy, no framing rule. That matters most on
     * /checkout, which loads Stripe, PostHog, Google Fonts AND babylist.com's
     * add.js together - and the shipping form (name, street address, email) is
     * ordinary DOM that any of those scripts can read. Card fields are inside
     * Stripe's iframes and were never exposed.
     *
     * The CSP ships REPORT-ONLY first. Enforcing a wrong policy breaks
     * checkout for everyone, and the only honest way to know it is right is to
     * watch a real browser load every page with it on. Flip the header name to
     * 'Content-Security-Policy' once the console is clean - the value does not
     * change.
     */
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' is required by the JSON-LD blocks and Next's inline
      // bootstrap. A nonce would need middleware, which would opt every route
      // out of static prerendering - the one thing this site cannot trade away.
      "script-src 'self' 'unsafe-inline' https://babylist.com https://us.i.posthog.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.stripe.com https://us.i.posthog.com",
      // Stripe Elements render in iframes we embed; m.stripe.network is used
      // for its fraud signals.
      // Stripe.js is gone with the card form: nothing embeds a Stripe iframe
      // any more, and payment happens on Stripe's own hosted invoice page.
      "frame-src https://challenges.cloudflare.com",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // Nothing here should ever be framed by anyone.
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            // Stripe needs payment; nothing here needs the rest.
            value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
          },
        ],
      },
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
