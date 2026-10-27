/*
 * 410 Gone, for old-store URLs whose product is withdrawn for good (the list is
 * SHOPIFY_GONE_PATHS in src/lib/shopify-redirects.ts; next.config.ts rewrites
 * each one here, because redirects() cannot answer with a 410).
 *
 * A 410 tells Google the page is gone on purpose, so it drops the URL sooner
 * than a 404 it keeps re-checking. noindex is belt-and-braces. No request data
 * is read; Next serves a non-200 handler on demand, but it is a few bytes and
 * the response is cacheable.
 */

const GONE_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'X-Robots-Tag': 'noindex',
  'Cache-Control': 'public, max-age=3600',
};

const GONE_BODY =
  'This product is no longer available. Browse our current collection at /products.\n';

export function GET(): Response {
  return new Response(GONE_BODY, { status: 410, headers: GONE_HEADERS });
}

export function HEAD(): Response {
  return new Response(null, { status: 410, headers: GONE_HEADERS });
}
