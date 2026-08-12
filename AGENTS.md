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

Every one of those is generated and gitignored. `data/` holds nothing else;
the hand-maintained copies of the catalogue that used to sit there
(`data/{inventory,images,settings,showroom,stain-types}.json`, plus
`public/data/{stains,variants,settings,stain-types}.json`) were stale by
hundreds of rows, read by nothing, and have been removed.

A product directory's NAME is the image base path, so it cannot contain a
slash: three products replace `/` with `-` (`3-4 Guard Rail` for the product
`3/4 Guard Rail`). `productName` in `product.json` is the real name; the
directory is only a path.

`product.json` must declare `variantType` — `wood`, `size`, `finish` or `none`
— saying what the `variant` field means for that product. It is validated
against the actual variant names at build time and the build fails on a
mismatch. Do not reintroduce composite `"BrownMaple / Antique Slate"` variants:
they hide a wood inside a finish, and the finish selector will not render.

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
- Product URLs `/product/<slug>` are stable by preference, not by constraint.
  An earlier note claimed they were live and referenced by Babylist registry
  entries; the site is not public and nothing has been registered, so there is
  no external link to break. Change a slug when a better one exists — but keep
  them stable once the site does go live.
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
- `STRIPE_WEBHOOK_SECRET` — server only; verifies `/api/stripe/webhook`. The
  route returns 503 rather than trusting an unsigned body.
- `ORDER_TOKEN_SECRET` — server only; HMAC key for order-lookup tokens. Required,
  with no fallback (`openssl rand -hex 32`). The token is passed to
  `/api/orders/*` in the `x-order-token` header only — never in the URL, because
  PostHog captures `$current_url` with its query string.
- `GITHUB_TOKEN`, `VERCEL_TOKEN` — local tooling only

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
