import type { Metadata } from 'next';
import { getShowroom, getInventory } from '@/lib/content';
import { organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import ShowroomSlideshow from '@/components/showroom/ShowroomSlideshow';
import FeaturedGrid from '@/components/showroom/FeaturedGrid';
import JourneyTimeline from '@/components/showroom/JourneyTimeline';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  const showroom = getShowroom();
  const inventory = getInventory();

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

      {/*
        The homepage had no h1 at all - its highest heading was an h2 inside the
        slideshow. Visually hidden because the hero is imagery, but the document
        now has a proper top-level heading.
      */}
      <h1 className="visually-hidden">
        Heirloom Cribs and More — handcrafted nursery furniture
      </h1>

      <ShowroomSlideshow slides={showroom?.slides ?? []} inventory={inventory} />
      <div className="container">
        <FeaturedGrid featured={showroom?.featured ?? []} inventory={inventory} />
      </div>
      <JourneyTimeline />
    </>
  );
}
