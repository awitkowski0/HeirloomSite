# HeirloomSite

Furniture e-commerce site. Next.js App Router + TypeScript, deployed on Vercel.

## Tech stack
- Next.js 16 (App Router), React 19, TypeScript 6
- Vanilla CSS with custom properties (`src/app/globals.css`)
- Stripe (checkout), PostHog (analytics), MiniSearch (product search)
- ESLint flat config

## Key directories
- `src/app/` — routes. Server components by default; `'use client'` only on
  boundary files (anything they import is in the client bundle automatically
  and must NOT carry the directive).
- `src/components/` — grouped by feature (layout, search, product, products,
  gallery, checkout, order, contact, ui)
- `src/lib/` — content accessors, SEO helpers, pricing, search, formatting
- `src/context/` — cart (localStorage via useSyncExternalStore)
- `data/` — source data, plus generated `pricing.json`
- `public/data/` — generated JSON served to clients
- `scripts/` — build/data processing

## Data flow
`npm run build` runs `scripts/build-data.mjs` first, which reads
`public/data/products/*/{product,variants,media}.json` and emits:
- `public/data/{inventory,products,images}.json` — read at build time by
  `src/lib/content.ts` (server-only)
- `src/data/search-docs.json` — lazily imported by the client search
- `data/pricing.json` — statically imported by the payment-intent route

The script has hard guards and **exits 1** rather than emit a short or
slug-less product list. Every product is statically prerendered at
`/product/<slug>`, so a silent data failure would ship a deploy that 404s
already-indexed URLs. `MIN_EXPECTED_PRODUCTS` is a deliberate tripwire — if you
intentionally remove a product, lower it.

## Rules worth knowing
- **Never read `searchParams` in a page**, and never call `useSearchParams()`
  outside a `<Suspense>` boundary. Either one opts the route out of static
  prerendering, which silently undoes the site's SEO. Check the `next build`
  route table: any `ƒ` on a content route is a regression.
- Product URLs `/product/<slug>` are live and referenced by Babylist registry
  entries. Do not change them.
- The client never sends prices. `src/lib/pricing.ts` is the only source of
  truth for what a cart costs, and all money is in integer cents.
- Responsive work is CSS-first: one component, one DOM tree, layout switched in
  CSS. Do not mount two variants and hide one — `display:none` does not stop
  images loading.

## Feature workflow
1. Branch off `dev`: `feature-<kebab-title>-<timestamp>`
2. Implement, verify (`npm run lint`, `npm run typecheck`, `npm run build`)
3. Commit, push, then `node scripts/create-pr.mjs "<title>"`

## Env vars
- `NEXT_PUBLIC_SITE_URL` — canonical origin for canonicals/sitemap/og:image
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `STRIPE_SECRET_KEY` — server only
- `ORDER_TOKEN_SECRET` — server only; HMAC key for order-lookup tokens. Must be
  independent of the Stripe key (`openssl rand -hex 32`).
- `GITHUB_TOKEN`, `VERCEL_TOKEN` — local tooling only
