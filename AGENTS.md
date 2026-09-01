# HeirloomSite

Furniture e-commerce site. Next.js App Router + TypeScript, deployed on Vercel.

## Tech stack
- Next.js 16 (App Router), React 19, TypeScript 6
- Vanilla CSS with custom properties (`src/app/globals.css`)
- Stripe (invoicing), PostHog (analytics), MiniSearch (product search)
- ESLint flat config

## Key directories
- `src/app/` — routes. Server components by default; `'use client'` only on
  boundary files (anything they import is in the client bundle automatically
  and must NOT carry the directive).
- `src/components/` — grouped by feature (layout, search, product, products,
  gallery, checkout, home, contact, ui)
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
- `data/pricing.json` — statically imported by `src/lib/pricing.ts`

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

## Browse taxonomy

`src/lib/taxonomy.ts` DECLARES the category tree; products are mapped into it
by the `category` value in their `product.json`. It is not derived from the
catalogue any more, and cannot be: Clothing, Bath, Newborn Must-Haves, Gift
Sets, Toys and Bedding are real categories with real copy and no stock yet, and
a list counted from products can only show what already exists.

- `sources` on a node names the `category` values that land there. A parent
  owns its own sources plus everything under its children.
- **Empty nodes are pruned, not removed.** `getTaxonomy()` in `src/lib/content.ts`
  drops any node with no products before the nav, the routes or the sitemap see
  it, so an unstocked category costs nothing and appears by itself the moment a
  product declares that category. No deploy of taxonomy.ts required.
- **URLs are flat.** A sub-menu is `/products/<its own slug>`, not
  `/products/<parent>/<child>`. The hierarchy is a navigation affordance;
  nesting it in the path would rename every category URL and buy nothing.
- `assertNoOrphanedCategories()` fails the build if a product sits in a category
  that no node claims and that is not deliberately unlisted. A product nobody
  can browse to would otherwise just quietly vanish.

**Unlisted is not hidden.** `UNLISTED_CATEGORIES` (the conversion kits and the
crib mattress) drops products from the nav, the grids, `/products`, search and
the sitemap while leaving their routes, their `pricing.json` rows and their
place in every crib bundle intact. Do NOT use `hidden: true` for this - that
removes the product from `pricing.json`, which makes it unbuyable and breaks
the bundle on all fifteen cribs.

**Collections are the second axis** and ARE derived, in `src/lib/collections.ts`.
A category says what a piece is; a collection says what matches your crib. The
reasoning is opposite to the taxonomy on purpose: a category must exist before
it has stock, a collection means nothing until it does.

## The order lifecycle

Checkout takes no card. `POST /api/quotes` prices the cart server-side and
creates a **draft** Stripe invoice, then stops. Every step after that is a
person, on purpose - these are made-to-order pieces and the stain, the kit list
or the price can all have moved since the conversation.

```
/api/quotes        → Customer + DRAFT invoice (kind: deposit | full) + 2 emails
shop reviews it    → presses Send in the Stripe dashboard        [manual]
customer pays      → on Stripe's hosted invoice page
invoice.paid       → webhook logs it, mails the shop and the customer
staining finishes  → node scripts/create-balance-invoice.mjs HC-XXXXXXXX  [manual]
                     creates the DRAFT balance invoice
shop reviews it    → presses Send                                [manual]
```

Checkout offers **three** ways to pay, and only one of them changes the money:
`deposit` (50% now, balance later), `full`, and `affirm` — which bills exactly
like `full` and differs in the metadata, the confirmation email and the fact
that the customer was told to expect Affirm on the invoice. Nothing names
`affirm` in `payment_settings`: a payment method the account has switched off
fails invoice creation, so the option inherits the account default the same way
`full` does. Affirm is offered only between $35 and $30,000 (Affirm's own USD
range) and `resolvePaymentOption()` degrades it to `full` outside that, because
Stripe would not present Affirm there anyway.

A deposit order is **two** invoices. One invoice cannot have two due dates, so
the deposit is invoiced now and the balance when the staining is done. The
deposit invoice itemises the whole order and carries a negative
"Balance due on completion" line, so it shows what was bought while asking for
half of it. All of the sales tax is charged on the deposit; the balance invoice
has no tax line.

`splitPayment()` in `src/lib/order-terms.ts` defines the balance as
*total minus deposit*, and `create-balance-invoice.mjs` READS that figure from
the deposit invoice's `due_later_cents` metadata rather than recomputing it.
That is what guarantees the two invoices sum to the order total even if the
price list has moved since. Do not make the script re-price anything.

Nothing creates the balance invoice automatically. The `invoice.paid` alert to
the shop carries the exact command to run, so the follow-up lives in an inbox
rather than in someone's memory.

There is no database. Stripe is the record, and `order_ref` / `order_hash` in
invoice metadata are the join keys - `stripe.invoices.search` answers "what does
this customer still owe".

## Env vars
- `NEXT_PUBLIC_SITE_URL` — canonical origin for canonicals/sitemap/og:image
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — production points the
  HOST at a reverse proxy on our own domain
  (`https://info.heirloomcribsandmore.com`), set in the Vercel project settings,
  because tracker blocklists drop a request to `*.posthog.com` outright and the
  `product-<slug>` flags go down with the analytics. `next.config.ts` builds the
  PostHog entries of the CSP from this variable, so setting it moves both — but
  it is read at BUILD time, so a deployment that gains the variable without a
  rebuild ships a policy that blocks the proxy. Next calls `loadEnvConfig`
  before it evaluates `next.config.ts`, which is what makes reading it there
  work at all. `ui_host` in `src/lib/posthog-client.ts` stays pointed at
  `https://us.posthog.com`: the proxy serves ingestion, not the app, and the
  toolbar and every "view in PostHog" link are built from it.
  The KEY is set in Vercel too, and `.env.production` is only a fallback for a
  production build made elsewhere — keep the two in step. They were not once,
  and a build outside Vercel quietly sent every event to a second, real PostHog
  project, which looks exactly like analytics being broken.
- `NEXT_PUBLIC_POSTHOG_DEBUG` — local only, never set in Vercel. `next dev`
  opts out of capturing entirely (dev traffic does not belong in the production
  project), which also means a broken capture cannot be found before it ships.
  Set it to `1` in `.env.local` to opt back in and turn on posthog-js logging.
  It compiles away in a production build, so setting it in Vercel does nothing.
- `STRIPE_SECRET_KEY` — server only
- `STRIPE_WEBHOOK_SECRET` — server only; verifies `/api/stripe/webhook`. The
  route returns 503 rather than trusting an unsigned body.
- `RESEND_API_KEY`, `ORDER_FROM_EMAIL`, `ORDER_NOTIFICATION_EMAIL` — server only;
  `ORDER_NOTIFICATION_EMAIL` is comma-separated for multiple recipients;
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
- `NEXT_PUBLIC_META_PIXEL_ID` — the Meta (Facebook) Pixel. **Production Vercel
  only**; leave it unset locally and in preview. Test traffic does not merely
  add noise to a pixel — Meta's optimiser learns from it, so fake conversions
  teach ad delivery to chase people who behave like you do while testing, which
  is slow and expensive to undo. Unset, `src/lib/meta-pixel.ts` loads nothing
  and every `metaTrack()` is a no-op. Unlike the PostHog origins, the Meta ones
  are named in the CSP unconditionally: a policy that only permits the pixel in
  the single environment where it runs cannot be tested before it ships.
- `RESEND_AUDIENCE_ID` — server only; the audience the email-capture popup
  writes to. Without it `/api/subscribe` answers 503 rather than accepting an
  address it has nowhere to put. Note the deliberate contrast with the order
  mail above: this one **cannot fail soft**. A quote is already a durable draft
  invoice before email is attempted, so a failed send loses nothing; here
  nothing is durable until Resend accepts the contact, so a soft failure would
  drop the address while telling the visitor they had subscribed.
- `GITHUB_TOKEN`, `VERCEL_TOKEN` — local tooling only

## Security posture

- Security headers live in `next.config.ts`. The CSP is deliberately shipped as
  `Content-Security-Policy-Report-Only`: enforcing a wrong policy breaks
  checkout for everyone, and the only honest way to know it is right is to watch
  a real browser load every page with it on. Flip the header NAME to
  `Content-Security-Policy` once the console is clean — the value does not
  change. `/checkout` is the page that matters: Stripe, PostHog, Google Fonts,
  Babylist and (if configured) Turnstile all load there together.
- Rate limiting is NOT implemented in code. Turnstile covers the bot case; add
  a Vercel Firewall rate-limit rule on `/api/quotes` **and `/api/subscribe`** for
  the volumetric one. Those are the endpoints that matter: both are anonymous,
  `/api/quotes` creates Stripe customers and invoices and sends mail from a
  verified domain to an address the caller supplies, and `/api/subscribe` writes
  a caller-supplied address into a marketing audience.
- Turnstile tokens are scoped by ACTION (`src/lib/turnstile-action.ts`), and
  `verifyTurnstile` takes the action it expects. This is not decoration: without
  it a token minted by the low-friction signup widget would be replayable
  against checkout. Adding a third protected endpoint means adding a third
  action, not reusing one.

## Consent

Analytics and advertising are **opt-in in EU/EEA, UK, Switzerland, Canada and
California**, and on by default elsewhere. `src/lib/consent.ts` owns the state;
`/api/geo` classifies the visitor from Vercel's `x-vercel-ip-country` and
`-country-region` headers.

Four things here are load-bearing and easy to break:

- **Geo is a Route Handler, never middleware.** Middleware would opt every route
  out of static prerendering — the one thing this site cannot trade away. A
  Route Handler has no such effect. `/api/geo` must also send
  `Cache-Control: private, no-store`, or the CDN can serve one visitor's country
  to another.
- **A missing country header means consent IS required.** On Vercel the header
  is always present, so its absence means something is broken; a banner shown to
  everyone is a visible, safe failure rather than an invisible compliance one.
- **Captures made before consent resolves are QUEUED, not dropped.**
  `posthog.capture()` silently discards anything sent before init, and the geo
  fetch is always slower than component mount — in every region, not just the
  gated ones. Gating naively would re-break the top of the funnel worldwide,
  which is the bug `src/lib/posthog-client.ts` was written to fix in the first
  place. The queue flushes on grant with the ORIGINAL timestamps.
- **`initPostHog()` has callers outside `capture()`** — `src/app/providers.tsx`
  and `src/lib/useDelistedProducts.ts`. Every one of them must go through the
  gate, or the flag hook loads posthog-js for a visitor who has not consented
  and the banner is decorative. A visitor who declines gets no flags, so nothing
  is de-listed; that is the same fail-open behaviour documented under *Hiding a
  product*, with a second cause. Use `hidden: true` when a product must not be
  sellable.

Do NOT init PostHog with `persistence: 'memory'` for pending visitors as a
shortcut: `posthog.init` starts the session recorder before any opt-out
deterministically takes effect, and `opt_out_capturing()` itself writes to
localStorage. `opt_out_capturing()` is the right tool for *withdrawal* only,
where posthog is already loaded.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
