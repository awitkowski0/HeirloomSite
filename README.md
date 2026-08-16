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
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | PostHog analytics |

Server only:

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key. The only Stripe variable the browser side needs none of — no card is collected here. |
| `STRIPE_WEBHOOK_SECRET` | Verifies `/api/stripe/webhook`. The route returns 503 rather than trusting an unsigned body, so without it every payment confirmation is dropped. |
| `TURNSTILE_SECRET_KEY` | Required in production: `/api/quotes` is anonymous and sends mail to a caller-supplied address. |
| `RESEND_API_KEY` | Transactional email. Fails soft — the quote is already a draft invoice in Stripe. |
| `ORDER_FROM_EMAIL` | Sender, on a Resend-verified domain. |
| `ORDER_NOTIFICATION_EMAIL` | Where "new quote received" lands. |

## Deploying to Vercel

1. Import the repository. **Confirm the Framework Preset is Next.js** — a stale
   preset from the previous Vite setup produces a fully 404'd deploy.
2. Add the environment variables above under Settings → Environment Variables.
3. Deploy. `vercel.json` pins the framework preset; nothing else is configured there.

## Payments

**Checkout takes no card.** It records a commitment and creates a *draft* Stripe
invoice that waits in the dashboard until a person reviews it and presses Send.
That is what the terms have always described: a 48-hour written cancellation
window and a minimum 50% non-refundable deposit.

The client never sends prices. `src/lib/pricing.ts` re-derives every amount from
`data/pricing.json`, validates quantities and add-ons against the catalogue, and
computes in integer cents. Sales tax is charged only for Pennsylvania, where the
shop has nexus.

A deposit order is **two** invoices, because one invoice cannot have two amounts
due at two times:

1. `POST /api/quotes` creates the deposit invoice — itemised, with all of the
   sales tax and a negative "Balance due on completion" line, so it shows the
   whole order while asking for half of it.
2. When the staining is finished, `node scripts/create-balance-invoice.mjs
   HC-XXXXXXXX` creates the balance invoice as another draft. It reads the
   amount from the deposit's `due_later_cents` metadata rather than re-pricing,
   which is what guarantees the two sum to the order total. `--dry-run` shows
   what it would create.

Nothing creates the balance invoice automatically — only a person knows when a
piece is actually done. The `invoice.paid` alert to the shop carries the exact
command to run, so the follow-up lives in an inbox rather than in someone's
memory.

`/api/stripe/webhook` verifies the Stripe signature and handles `invoice.paid`,
`invoice.payment_failed`, `invoice.sent`, `invoice.finalized`, `invoice.voided`
and `invoice.marked_uncollectible`. On payment it logs the event and emails both
the shop and the customer. Mail failures are soft: by the time mail is attempted
the order is already durable in Stripe, so failing the request would tell a
customer their order failed when it did not.

There is no database. Stripe is the record, and `order_ref` / `order_hash` in
invoice metadata are the join keys.

### Before taking real orders

- Set `STRIPE_WEBHOOK_SECRET` and register the endpoint, or payment
  confirmations are silently dropped.
- Set `TURNSTILE_SECRET_KEY`, or `/api/quotes` refuses to send the customer
  confirmation email at all.
- In the Stripe dashboard, turn on customer invoice emails and automatic payment
  reminders. `collection_method: 'send_invoice'` is already set, which is the
  precondition; without the setting, pressing Send does nothing the customer sees.

## SEO

`generateStaticParams` prerenders every product and category route;
`generateMetadata` supplies titles, truncated descriptions and canonicals;
`app/sitemap.ts` emits all 86 indexable URLs and `app/robots.ts` excludes
checkout, search and `/api/`. Product pages carry `Product` /
`AggregateOffer` and `BreadcrumbList` JSON-LD.
