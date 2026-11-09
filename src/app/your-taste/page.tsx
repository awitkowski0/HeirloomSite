import type { Metadata } from 'next';
import WhatWeLearned from '@/components/interest/WhatWeLearned';
import { getInterestCatalog } from '@/lib/interest/catalog-server';

export const metadata: Metadata = {
  title: "What we've learned",
  description: 'See what this site has picked up about your taste on this device, clear it, or turn it off.',
  robots: { index: false, follow: false },
};

/* Static like every content route: the profile is read in the browser, after this HTML. */
export default function YourTastePage() {
  return <WhatWeLearned catalog={getInterestCatalog()} />;
}
