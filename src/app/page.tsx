import type { Metadata } from 'next';
import { getShowroom, getInventory } from '@/lib/content';
import { organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import { resolveFeature, indexByProductName } from '@/lib/showroom';
import HomeHero from '@/components/home/HomeHero';
import ProvenanceBand from '@/components/home/ProvenanceBand';
import StyleCards from '@/components/home/StyleCards';
import '@/styles/home.css';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Server component, statically prerendered.
 *
 * Every child here is a server component too. One 'use client' or one
 * useSearchParams() in this tree flips the route to dynamic without failing
 * the build, which would quietly undo the migration's SEO work - watch the
 * route table, not just the exit code.
 */
export default function HomePage() {
  const showroom = getShowroom();
  const inventory = getInventory();
  const byName = indexByProductName(inventory);

  // The hero's detail crops come from a real catalogue photograph rather than
  // a placeholder, so the wood shown is wood we actually sell.
  const detailSource = resolveFeature({ productName: 'Mission Style' }, byName);
  const detail =
    detailSource?.image
      ? { slug: detailSource.slug, image: detailSource.image, name: detailSource.productName }
      : null;

  const heroImage = showroom?.slides?.[0]?.image ?? '/data/products/showroom/showroom_0.jpg';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }}
      />

      <HomeHero detail={detail} heroImage={heroImage} />
      <ProvenanceBand />
      <StyleCards inventory={inventory} />
    </>
  );
}
