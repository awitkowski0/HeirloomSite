import { NextResponse } from 'next/server';
import { FEED_HEADERS, merchantFeedXml } from '@/lib/merchant-feed';

/**
 * Google Merchant Center RSS 2.0 feed. Catalogue data is the same build-time
 * inventory sitemap.ts reads, so this is prerendered rather than computed
 * per request.
 */
export const dynamic = 'force-static';

export function GET(): NextResponse {
  return new NextResponse(merchantFeedXml(), { headers: FEED_HEADERS });
}
