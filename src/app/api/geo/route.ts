import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Where is this visitor, and do we have to ask before tracking them?
 *
 * WHY THIS IS A ROUTE HANDLER AND NOT MIDDLEWARE. Vercel's geo headers are
 * readable in middleware, which is the obvious place for this and the wrong
 * one: a middleware file opts every route out of static prerendering, which is
 * the one thing this site cannot trade away. A Route Handler is dynamic by
 * itself and has no effect whatsoever on the pages. The client fetches this
 * once per session and caches it.
 *
 * The jurisdiction list stays HERE rather than in the client bundle. Callers
 * get a boolean. That keeps a list of countries out of every page's JavaScript
 * and means widening or narrowing the gate is a one-file server change.
 */

/*
 * Opt-in required. EU27 + the three non-EU EEA states + the UK and Switzerland,
 * then Canada.
 *
 * Canada is here for Quebec's Law 25, which is effectively opt-in. The gate is
 * applied to the whole country because the region header would only narrow it
 * to QC, and asking a Vancouver visitor a question we did not have to ask is a
 * far cheaper mistake than not asking a Montreal one.
 */
const CONSENT_REQUIRED_COUNTRIES = new Set([
  // EU 27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA, non-EU
  'IS', 'LI', 'NO',
  // UK and Switzerland - not EEA, own regimes, same answer
  'GB', 'CH',
  // Canada
  'CA',
]);

/*
 * California, via `x-vercel-ip-country-region`, which is a subdivision code and
 * is 'CA' only when the country is 'US'. Note the collision: 'CA' is also
 * Canada's country code, which is exactly the confusion this pair of checks
 * exists to keep apart.
 *
 * CCPA/CPRA is an opt-OUT regime, so gating California behind opt-in is
 * stricter than the law requires and costs some measurement on a large market.
 * That is a deliberate call: over-gating is legally safe, and narrowing it later
 * means deleting one condition.
 */
function isConsentRequired(country: string | null, region: string | null): boolean {
  if (!country) return true;
  if (CONSENT_REQUIRED_COUNTRIES.has(country)) return true;
  return country === 'US' && region === 'CA';
}

export async function GET(req: Request) {
  const headers = req.headers;
  let country = headers.get('x-vercel-ip-country');
  let region = headers.get('x-vercel-ip-country-region');

  /*
   * Test override, development only.
   *
   * NODE_ENV is inlined at build time, so this whole branch compiles away in a
   * production bundle - a query parameter must never be able to talk a real
   * visitor out of a consent prompt.
   */
  if (process.env.NODE_ENV !== 'production') {
    const url = new URL(req.url);
    country = url.searchParams.get('country') ?? country;
    region = url.searchParams.get('region') ?? region;
  }

  country = country ? country.toUpperCase() : null;
  region = region ? region.toUpperCase() : null;

  return NextResponse.json(
    { country, region, consentRequired: isConsentRequired(country, region) },
    {
      headers: {
        /*
         * MANDATORY, not hygiene. Without it a CDN or an intermediary is free to
         * hand one visitor's country to the next one, which would show US
         * traffic the EU banner or - the failure that actually matters - track
         * an EU visitor because a Texan was served from the same cache entry.
         * `force-dynamic` governs rendering, not what caches downstream do.
         */
        'Cache-Control': 'private, no-store, max-age=0',
      },
    }
  );
}
