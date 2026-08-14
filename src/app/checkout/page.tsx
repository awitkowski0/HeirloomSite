import type { Metadata } from 'next';
import CheckoutClient from '@/components/checkout/CheckoutClient';
import recommendations from '@/data/recommendations.json';
import type { Recommendation } from '@/components/checkout/AlsoLike';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  /*
   * Handed in from the server rather than imported by the client component, so
   * the table travels in the prerendered payload instead of the JS bundle.
   * 0.6 KB gzipped either way, but this keeps it off the critical path for a
   * page whose job is to not get in the way of paying.
   */
  return <CheckoutClient recommendations={recommendations as Record<string, Recommendation[]>} />;
}
