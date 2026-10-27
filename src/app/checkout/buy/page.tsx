import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import recommendations from '@/data/recommendations.json';
import type { Recommendation } from '@/components/checkout/AlsoLike';
import CheckoutDeeplinkClient from '@/components/checkout/CheckoutDeeplinkClient';
import { checkoutProductForFeedId, parseCheckoutDeeplink } from '@/lib/checkout-deeplink';

/*
 * Internal landing for the Merchant Center checkout deep link. The public URL
 * is /checkout/{id}:{qty}; proxy.ts rewrites it here with the raw "{id}:{qty}"
 * spec in ?spec= (a path segment with a colon or spaces is not matchable by the
 * Next router, a query value is). Rendered on each request so the product is in
 * the server HTML; an id that is not in the feed 404s.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default async function CheckoutBuyPage({
  searchParams,
}: {
  searchParams: Promise<{ spec?: string | string[] }>;
}) {
  const { spec } = await searchParams;
  const raw = Array.isArray(spec) ? spec[0] : spec;
  if (!raw) notFound();
  const { id, quantity } = parseCheckoutDeeplink(raw);
  const product = checkoutProductForFeedId(id);
  if (!product) notFound();

  return (
    <CheckoutDeeplinkClient
      product={product}
      quantity={quantity}
      recommendations={recommendations as Record<string, Recommendation[]>}
    />
  );
}
