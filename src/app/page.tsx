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
import { SHIPPING_LIMIT_NOTE } from '@/lib/order-terms';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const OPENING = 'bloomington';
const STARTERS = ['bloomington', 'mini-newport-with-mattress', 'newport-7-drawer-dresser', 'newport-nightstand'];

/* Statically prerendered. The prompt and the four pieces are client islands. */
export default function HomePage() {
  const items = toShopItems(getBrowsableProducts());
  const opening = items.find(i => i.slug === OPENING);
  const natural = opening?.finishImages.find(f => f.name === 'Natural');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(webSiteJsonLd()) }} />

      <section className="opening">
        <Link href={`/product/${OPENING}`} className="opening-photo" aria-label="Bloomington crib">
          {natural ? <Image src={natural.image} alt="Bloomington crib in Natural" fill priority sizes="(max-width: 859px) 100vw, 55vw" /> : null}
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
          <p className="section-more"><Link href="/pick" className="link">Not sure? Pick between two photos, seven times</Link></p>
        </section>

        <section className="section section--two">
          <div>
            <h2>Why does a crib cost over $2,000?</h2>
            <p>Fair question. A shop builds this one after you order, in solid brown maple. It also keeps going after the baby years, when you add the conversion kits.</p>
            <p className="section-more"><Link href={`/product/${OPENING}#why`} className="link">See how one adds up</Link></p>
          </div>
          <div>
            <h2>Solid wood cribs from shops we can name.</h2>
            <p>We started Heirloom after a hard search for a solid wood crib for our first grandchild. Everything here is built to order by an independent shop.</p>
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
