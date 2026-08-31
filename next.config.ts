import type { NextConfig } from 'next';

/*
 * The origins PostHog is reached on, for the CSP below.
 *
 * Analytics ingestion goes through a reverse proxy on our own domain
 * (info.heirloomcribsandmore.com), which is the whole point: a request to
 * *.posthog.com is dropped outright by most tracker blockers. The CSP has to
 * name whatever NEXT_PUBLIC_POSTHOG_HOST is set to, or the browser blocks the
 * thing the proxy exists to get through - posthog-js sends every event there
 * and lazy-loads exception-autocapture.js from there at runtime.
 *
 * PostHog's own origins stay in the list. A build with the variable unset -
 * `next dev`, a preview deploy without it - falls back to them in
 * posthog-client.ts, and a CSP that silently stopped covering that case would
 * fail as a console error nobody is watching for.
 */
const POSTHOG_DEFAULT_ORIGINS = [
  'https://us.i.posthog.com',
  'https://us-assets.i.posthog.com',
];
const posthogOrigins = [
  ...new Set([process.env.NEXT_PUBLIC_POSTHOG_HOST, ...POSTHOG_DEFAULT_ORIGINS].filter(Boolean)),
].join(' ');

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
      /*
       * The flat category list became a two-level taxonomy, so eight category
       * slugs no longer resolve. Permanent, because they were in the sitemap.
       *
       * Accessories and Guard Rails & Conversions have no destination: they are
       * unlisted now (see src/lib/taxonomy.ts) and land on the full grid rather
       * than a category that no longer exists. The products themselves keep
       * their own URLs.
       */
      ...[
        ['dressers', 'dressers-changing-tables'],
        ['changing-tables', 'dressers-changing-tables'],
        ['nightstands', 'nightstands-storage'],
        ['chests', 'nightstands-storage'],
      ].map(([from, to]) => ({
        source: `/products/${from}`,
        destination: `/products/${to}`,
        permanent: true,
      })),
      ...['accessories', 'guard-rails-and-conversions'].map(from => ({
        source: `/products/${from}`,
        destination: '/products',
        permanent: true,
      })),
      /*
       * The rugs and the lamp are withdrawn (`hidden` in their product.json),
       * which empties Decor, and Bedding was never stocked - so getTaxonomy()
       * prunes those nodes and Nursery with them, and four slugs that resolved
       * yesterday now 404. /products/area-rugs and /products/lamps redirected
       * here too, so without this they redirect into a dead page.
       *
       * TEMPORARY, unlike every redirect above: these categories return by
       * themselves the moment a product declares one of them, with no change to
       * taxonomy.ts. A 308 would be cached by every browser that saw it and
       * would keep sending people to /products long after the stock is back.
       */
      ...['nursery', 'decor', 'bedding', 'area-rugs', 'lamps'].map(from => ({
        source: `/products/${from}`,
        destination: '/products',
        permanent: false,
      })),
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
     * /checkout, which loads PostHog, Google Fonts, babylist.com's add.js and
     * Turnstile together - and the shipping form (name, street address, email)
     * is ordinary DOM that any of those scripts can read. No card is collected
     * anywhere on this site: payment happens later, on Stripe's hosted invoice
     * page, on Stripe's own domain.
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
      `script-src 'self' 'unsafe-inline' https://babylist.com ${posthogOrigins} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      // No api.stripe.com: the browser never talks to Stripe. The server does,
      // from /api/quotes, which a page CSP has no say over.
      // api.radar.io is the checkout address lookup - a plain fetch with a
      // publishable key, so it needs connect-src and no script-src entry.
      //
      // Session recording needs nothing beyond the PostHog origins already
      // here: the recorder is a script fetched from the assets host and the
      // snapshots POST to /s/ on the same host, so script-src and connect-src
      // above cover it. ONE exception, which matters when this policy is
      // finally enforced: canvas recording spins up a Web Worker from a
      // blob: URL, and `worker-src` falls back to `default-src 'self'`, so it
      // would be blocked. It is off in the PostHog project settings and the
      // SDK never reaches that path - but turning it on there is a dashboard
      // click with no diff, and the replays would break silently. Add
      // `worker-src blob:` at the same time, not afterwards.
      `connect-src 'self' ${posthogOrigins} https://api.radar.io`,
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
            // Nothing on this site requests any of these. The payment feature
            // went with Stripe.js - no page here opens a payment sheet.
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
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
