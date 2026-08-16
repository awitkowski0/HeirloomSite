import type { Metadata } from 'next';
import { getShowroom, getInventory } from '@/lib/content';
import { variantHref } from '@/lib/variants';
import { organizationJsonLd, webSiteJsonLd,
  jsonLdScript,
} from '@/lib/seo';
import { resolveFeature, indexByProductName } from '@/lib/showroom';
import HomeHero from '@/components/home/HomeHero';
import ProvenanceBand from '@/components/home/ProvenanceBand';
import StyleCards from '@/components/home/StyleCards';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import JourneyStep from '@/components/home/JourneyStep';
import JourneyPoints from '@/components/home/JourneyPoints';
import { SHIPPING_METHODS, SHIPPING_LIMIT_NOTE } from '@/lib/order-terms';
import { formatPrice } from '@/lib/format';
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
  /*
   * The Mission crib in Natural, which is what the hero photography shows.
   *
   * 'Mission', not 'Mission Style' - the same stale name that emptied
   * StyleCards also left the hero with no detail image. `resolveFeature`
   * already prefers Natural and falls back to the first in-stock stain, so the
   * link cannot point at a finish that is not for sale.
   */
  const detailSource = resolveFeature({ productName: 'Mission', stainName: 'Natural' }, byName);
  const detail =
    detailSource?.image
      ? {
          slug: detailSource.slug,
          image: detailSource.image,
          name: detailSource.productName,
          // Deep link to the exact configuration rather than the bare product
          // page, so the finish in the photograph is the finish that loads.
          href: variantHref(detailSource.slug, detailSource.wood, detailSource.stainName),
        }
      : null;

  const heroImage = showroom?.slides?.[0]?.image ?? '/data/products/showroom/showroom_0.jpg';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(webSiteJsonLd()) }}
      />

      <HomeHero detail={detail} heroImage={heroImage} />
      <ProvenanceBand />

      {/*
        Everything below the banner is the buying journey, in order.
        
        The four steps are the page's structure rather than a band summarising
        it: a made-to-order shop's hardest job on a homepage is explaining the
        SEQUENCE - no card at checkout, an invoice later, weeks of building -
        and a visitor who does not know that misreads the whole thing. Step 01
        carries the products, so the journey is where the shopping happens
        rather than a detour around it.
      */}
      <div className="home-journey">
        <JourneyStep
          n="01"
          title="Choose and Customize"
          lead="Pick the silhouette first; the hardwood and the finish follow. Every crib converts through four stages and arrives with the rails to do it."
        >
          <FeaturedProducts />
          <StyleCards inventory={inventory} />
        </JourneyStep>

        <JourneyStep
          n="02"
          title="Confirm Order"
          lead="Nothing is charged when you place an order. We read it, check the details with you, and only then ask for anything."
        >
          <JourneyPoints
            points={[
              'No card is taken at checkout — the order is a commitment, not a charge.',
              'We call to confirm the stain, the kit list and the delivery before anything is built.',
              'A secure Stripe invoice follows, usually within one business day. A minimum 50% deposit begins production.',
            ]}
          />
        </JourneyStep>

        <JourneyStep
          n="03"
          title="Built and Finishing by Hand"
          lead="Your piece is cut, joined and finished to order in solid American hardwood — six to eight weeks, because nothing is waiting in a warehouse."
        >
          <JourneyPoints
            points={[
              'Sustainably sourced maple, cherry and red oak. Never veneer over particle board.',
              'Non-toxic, baby-safe finishes, hand-applied.',
              'The remaining balance is invoiced once the staining is complete — not before.',
            ]}
          />
        </JourneyStep>

        <JourneyStep
          n="04"
          title="Delivered to Your Nursery"
          lead="You choose how it arrives when you order. Both tiers are handled by our trusted partners, not a freight terminal."
        >
          {/*
            Priced from SHIPPING_METHODS, the same constant the checkout charges
            from, so the homepage cannot quote a delivery price the cart then
            contradicts.
          */}
          <JourneyPoints
            points={[
              ...SHIPPING_METHODS.map(m => `${m.name} — ${formatPrice(m.cents / 100)}. ${m.description}`),
              SHIPPING_LIMIT_NOTE,
            ]}
          />
        </JourneyStep>
      </div>
    </>
  );
}
