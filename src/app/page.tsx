import { variantHref } from '@/lib/variants';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import IntentBox from '@/components/home/IntentBox';
import StartWith from '@/components/home/StartWith';
import TalkToPerson from '@/components/layout/TalkToPerson';
import { getBrowsableProducts } from '@/lib/content';
import { getInterestCatalog } from '@/lib/interest/catalog-server';
import { organizationJsonLd, webSiteJsonLd, jsonLdScript } from '@/lib/seo';
import { toShopItems } from '@/lib/shop';
import { roomImagesFor } from '@/lib/room-images';
import RoomRow from '@/components/marketing/RoomRow';
import { SHIPPING_LIMIT_NOTE } from '@/lib/order-terms';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const OPENING = 'bloomington';
const STARTERS = ['bloomington', 'mini-newport-with-mattress', 'newport-7-drawer-dresser', 'newport-nightstand'];

/* Statically prerendered. The prompt and the four pieces are client islands. */
export default function HomePage() {
  const items = toShopItems(getBrowsableProducts());
  const rooms = items.flatMap(item => roomImagesFor(item.slug).slice(0, 1).map(room => ({ ...room, href: `/product/${item.slug}`, name: item.name })));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(webSiteJsonLd()) }} />

      <section className="opening">
        <Link href={variantHref(OPENING, 'BrownMaple', 'Natural')} className="opening-photo" aria-label="Bloomington crib">
          <Image src="/images/picks/opening-natural.jpg" alt="Bloomington crib in Natural" fill priority sizes="(max-width: 859px) 100vw, 55vw" />
        </Link>
        <IntentBox />
      </section>

      <div className="page">
        <section className="section">
          <div className="section-head">
            <h2>A few to start with</h2>
            <Link href="/products" className="link">See everything</Link>
          </div>
          <StartWith items={items} starters={STARTERS} catalog={getInterestCatalog()} />
          <p className="section-more"><Link href="/pick" className="link">Not sure what you like? Let us help you choose</Link></p>
        </section>

        {rooms.length > 1 && (
          <section className="section">
            <div className="section-head"><h2>In the room</h2></div>
            <RoomRow items={rooms} label="Pieces in a room" />
          </section>
        )}

        <section className="section section--two">
          <div>
            <h2>Why does a crib cost over $2,000?</h2>
            <p>It’s built by hand after you order, in solid brown maple. With the conversion kits it becomes a toddler bed and later a full-size bed.</p>
            <p className="section-more"><Link href={`/product/${OPENING}#why`} className="link">See how one adds up</Link></p>
          </div>
          <div>
            <h2>Who builds our furniture</h2>
            <p>We started Heirloom when we couldn’t find a solid wood crib for our first grandchild. Every piece is built to order by a small independent shop.</p>
            <p className="section-more"><Link href="/about-heirloom" className="link">Our story</Link> <Link href="/builders" className="link">The builders</Link></p>
          </div>
        </section>

        <section className="section section--two">
          <div>
            <h2>Buying it for someone else?</h2>
            <p>Call us and we’ll set up the order by hand. You can also add pieces to a Babylist registry.</p>
            <p className="section-more"><Link href="/gifts" className="link">Gift ideas</Link> <TalkToPerson /></p>
          </div>
          <div>
            <h2>How buying works</h2>
            <ol className="steps">
              <li>Order with no card. We call to confirm the stain, the kit list and the delivery.</li>
              <li>A secure Stripe invoice follows within 48 hours of your order. A minimum 50% deposit begins production. You can also pay in full, or use Affirm.</li>
              <li>The builder makes it. We confirm your <Link href="/timeline">lead time</Link> when you order, and collect the balance before final delivery.</li>
              <li>You choose Curbside or White Glove. Shipping is charged separately, and assembly comes only with White Glove. {SHIPPING_LIMIT_NOTE} <Link href="/shipping">Delivery</Link></li>
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}
