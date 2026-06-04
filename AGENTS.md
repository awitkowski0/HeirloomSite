# HeirloomSite

Furniture e-commerce site. React + TypeScript, Vite, deployed on Vercel.

## Tech stack
- React 19, TypeScript 6, Vite 8
- React Router v7 (routes in src/App.tsx)
- React Helmet Async (page titles/meta)
- Stripe + PayPal (checkout)
- PostHog (analytics)
- MiniSearch (product search)
- ESLint (flat config)

## Key directories
- `src/pages/` — page components (Products, ProductDetails, Checkout, Contact, Showroom, Gallery, OrderConfirmation)
- `src/components/` — shared components (Header, MobileSearch, etc.)
- `src/context/` — React context (useCart)
- `src/lib/` — utilities (search.ts)
- `data/` — source data (products, inventory, images, stains, settings)
- `public/data/` — built JSON served to clients (built from data/ by scripts/build-data.mjs)
- `api/` — Vercel serverless functions (Stripe payment intents, orders)
- `scripts/` — build/data processing scripts

## Data flow
1. `node scripts/build-data.mjs` assembles product data into `public/data/`
2. `npm run build` runs build-data, tsc, then vite build

## Feature workflow
When building a feature:
1. Branch off `dev`: `feature-<kebab-title>-<timestamp>`
2. Implement, verify (lint + build), commit, push
3. Run `node scripts/create-pr.mjs "<title>"` to create PR + get Vercel preview URL

## Env vars
- `VITE_STRIPE_PUBLIC_KEY` — Stripe publishable key
- `VITE_POSTHOG_TOKEN` — PostHog project token
- `STRIPE_SECRET_KEY` — Stripe secret (Vercel only)
- `GITHUB_TOKEN` — GitHub PAT for PR creation
- `VERCEL_TOKEN` — Vercel token for deploy URL
