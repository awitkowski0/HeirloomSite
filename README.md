# Heirloom Cribs

Handcrafted nursery furniture storefront. Next.js App Router + TypeScript,
deployed on Vercel.

## Architecture

All 73 products and 9 category pages are **statically prerendered at build
time**, so crawlers and social scrapers receive complete HTML rather than an
empty shell. Product data lives as JSON on disk, assembled by
`scripts/build-data.mjs` and read on the server by `src/lib/content.ts`.

Only the parts that genuinely need the browser are client components: cart,
search, the product configurator, checkout, and the gallery filters.

## Getting started

```bash
npm install
cp .env.example .env      # then fill in the values
npm run dev               # http://localhost:3000
```

`npm run dev` and `npm run build` both run the data build first.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Build data, then start the dev server |
| `npm run build` | Build data, then the production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run data:build` | Regenerate the data artifacts only |

## Environment variables

Public (exposed to the browser):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for canonical tags, `sitemap.xml` and absolute `og:image` URLs. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | PostHog analytics |

Server only:

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `ORDER_TOKEN_SECRET` | HMAC key for order-lookup capability tokens. Generate with `openssl rand -hex 32`. Keep it independent of the Stripe key so rotating Stripe does not invalidate outstanding order links. |

## Deploying to Vercel

1. Import the repository. **Confirm the Framework Preset is Next.js** — a stale
   preset from the previous Vite setup produces a fully 404'd deploy.
2. Add the environment variables above under Settings → Environment Variables.
3. Deploy. There is no `vercel.json`; Next.js is auto-detected.

## Payments

The client never sends prices. `src/lib/pricing.ts` re-derives every amount from
`data/pricing.json`, validates quantities and add-ons against the catalogue, and
computes in integer cents. The payment intent is created when the customer
submits their shipping details, and the server's own totals are what the
checkout renders.

Order lookup is protected by an HMAC capability token passed in an
`x-order-token` header (the `?token=` query form is still accepted so links
already sent to customers keep working).

> **Not yet implemented:** there is no Stripe webhook, so orders exist only as
> Stripe PaymentIntent metadata. A customer who closes the tab immediately after
> paying leaves no fulfilment record on our side. This is the most important
> outstanding gap.

## SEO

`generateStaticParams` prerenders every product and category route;
`generateMetadata` supplies titles, truncated descriptions and canonicals;
`app/sitemap.ts` emits all 86 indexable URLs and `app/robots.ts` excludes
checkout, order confirmation and search. Product pages carry `Product` /
`AggregateOffer` and `BreadcrumbList` JSON-LD.
