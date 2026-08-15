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

## Hiding a product

Two mechanisms, and they are not interchangeable.

**`"hidden": true` in `product.json` is a withdrawal.** The build skips the
product entirely, so there is no inventory row, no route, no sitemap entry, no
search document and no row in `data/pricing.json`. That last one is the point:
`src/lib/pricing.ts` prices every checkout line from that table and rejects
anything missing from it, so a hidden product cannot be bought even by posting
a hand-made cart straight at the API. The same key works on a variant in
`variants.json` to withdraw a single wood. Hidden products are dropped from
other products' `bundle`/`related` with a logged notice rather than failing the
build - a shared accessory is in fifteen bundles - while a slug that is merely
*wrong* still fails. Changing it needs a deploy.

**A `product-<slug>` PostHog flag set to false is a de-listing.** It removes the
product from grids, the cribs finish browser, search results, bundles and
recommendations, without a deploy. It does NOT remove the product page, the
sitemap entry, or the ability to buy it - every content route is statically
prerendered and flags are read in the browser after that HTML is built, and
evaluating them server-side would need `posthog-node` plus dynamic rendering,
which is the trade this site refuses. It also fails OPEN: an unknown flag, a
PostHog outage or a blocked script all leave the product visible, deliberately,
because failing closed would empty the catalogue the moment analytics broke.
A de-listed product is in the prerendered HTML and disappears when flags
arrive, so it flashes.

Use the flag for a soft launch or a quick de-list. Use `hidden` when it must
not be sellable. See `src/lib/useDelistedProducts.ts`.

## Env vars
- `NEXT_PUBLIC_SITE_URL` — canonical origin for canonicals/sitemap/og:image
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `STRIPE_SECRET_KEY` — server only
- `STRIPE_WEBHOOK_SECRET` — server only; verifies `/api/stripe/webhook`. The
  route returns 503 rather than trusting an unsigned body.
- `RESEND_API_KEY`, `ORDER_FROM_EMAIL`, `ORDER_NOTIFICATION_EMAIL` — server only;
  the quote confirmation to the customer and the alert to the shop. All fail
  **soft** with a loud warning: by the time email is attempted the quote is
  already a draft invoice in Stripe, so failing the request would tell a
  customer their order failed when it did not, and hand them a retry that
  creates a second invoice. `ORDER_FROM_EMAIL` must be on a Resend-verified
  domain.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` — Cloudflare
  Turnstile on the checkout submit. Both are optional and the integration is
  inert without them. **Required in production**: `/api/quotes` is anonymous and
  both creates Stripe Customers and sends email from a verified domain to an
  address the caller supplies, so an unprotected endpoint is an email-bombing
  amplifier that would burn the sending domain's reputation. The route already
  refuses to send the customer-facing email when Turnstile is unconfigured in
  production. Verified against Cloudflare's documented test secrets: fails
  closed on `2x0000...`, passes on `1x0000...`.
- `GITHUB_TOKEN`, `VERCEL_TOKEN` — local tooling only

## Security posture

- Security headers live in `next.config.ts`. The CSP is deliberately shipped as
  `Content-Security-Policy-Report-Only`: enforcing a wrong policy breaks
  checkout for everyone, and the only honest way to know it is right is to watch
  a real browser load every page with it on. Flip the header NAME to
  `Content-Security-Policy` once the console is clean — the value does not
  change. `/checkout` is the page that matters: Stripe, PostHog, Google Fonts,
  Babylist and (if configured) Turnstile all load there together.
- Rate limiting is NOT implemented in code. Turnstile covers the bot case;
  add a Vercel Firewall rate-limit rule on `/api/stripe/*` for the volumetric
  one, which also covers token guessing on `/api/orders/*`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
