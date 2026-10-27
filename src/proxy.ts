import { NextResponse, type NextRequest } from 'next/server';

/*
 * The Merchant Center checkout deep link is /checkout/{id}:{qty}. A path segment
 * containing a colon (or the spaces several feed ids have) is not matchable by
 * the Next router, so this rewrites any /checkout/<spec> request to the real
 * /checkout/buy page, carrying the raw "<id>[:<qty>]" spec as a query value
 * (which encodes any character cleanly). The rewrite is internal: the browser
 * keeps the original deep-link URL and the response is 200, which is what Google
 * tests. Scoped to /checkout/* so nothing else is touched.
 *
 * /checkout (the cart) and /checkout/buy (this target) pass straight through, so
 * the cart page is unchanged and the rewrite does not loop.
 */
export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const prefix = '/checkout/';
  if (!pathname.startsWith(prefix)) return NextResponse.next();
  if (pathname === '/checkout/buy') return NextResponse.next();

  const rawSegment = pathname.slice(prefix.length);
  if (!rawSegment) return NextResponse.next();

  let spec: string;
  try {
    spec = decodeURIComponent(rawSegment);
  } catch {
    spec = rawSegment;
  }

  const url = req.nextUrl.clone();
  url.pathname = '/checkout/buy';
  url.search = '';
  url.searchParams.set('spec', spec);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/checkout/:path*',
};
