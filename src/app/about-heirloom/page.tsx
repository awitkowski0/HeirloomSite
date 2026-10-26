import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Heirloom Cribs and More',
  description:
    'Heirloom Cribs and More is a Pennsylvania-based reseller of made-in-the-USA solid hardwood nursery furniture, built to order by Amish and independent US craftspeople.',
  alternates: { canonical: '/about-heirloom' },
  openGraph: { url: '/about-heirloom' },
};

export default function AboutHeirloomPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">About us</p>
      <h1 className="headline-xl">About Heirloom Cribs and More</h1>
      <p className="body-lg doc-lede">
        Heirloom Cribs and More is a Pennsylvania-based reseller of made-in-the-USA solid hardwood
        nursery furniture: cribs, dressers, chests and nightstands. We don&rsquo;t build the furniture
        ourselves. It&rsquo;s made to order by Amish and independent US craftspeople, and we help you
        choose the style, wood and stain, then bring it to your nursery.
      </p>

      <section>
        <h2 className="headline-md">Our builders</h2>
        <p>Our builders today are:</p>
        <ul className="doc-list">
          <li>
            <Link href="/builders/old-town-oak" className="doc-link">Old Town Oak</Link> &mdash;
            Topeka, Indiana
          </li>
          <li>
            <Link href="/builders/kids-comfort" className="doc-link">Kid&rsquo;s Comfort</Link> &mdash;
            Sugarcreek, Ohio
          </li>
          <li>
            <Link href="/builders/fishers-quality-products" className="doc-link">
              Fisher&rsquo;s Quality Products
            </Link>{' '}
            &mdash; Quarryville, Pennsylvania
          </li>
        </ul>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">How ordering works</h2>
        <p>
          Pick your piece and finish. We read your order and call you to confirm the stain, kits and
          delivery. Then we send an invoice for a 50% deposit. Your piece is built and finished by
          hand, and the balance is due once staining is complete. You can cancel at no cost any time
          before the deposit is paid. Once it&rsquo;s paid, the order goes to the builder and
          can&rsquo;t be cancelled, and made-to-order pieces can&rsquo;t be returned. Full terms are on
          our <Link href="/returns" className="doc-link">Returns &amp; Cancellations</Link> page.
        </p>
      </section>

      <section>
        <h2 className="headline-md">Delivery</h2>
        <p>
          Shipping is always charged and depends on your cart total. Curbside is drop-off only. White
          Glove is the only option that includes assembly. See{' '}
          <Link href="/shipping" className="doc-link">Delivery</Link> for the details.
        </p>
      </section>

      <section>
        <h2 className="headline-md">Where we are</h2>
        <p>
          We ship from our warehouse in Bethlehem, Pennsylvania. There is no showroom. The best way to
          reach us is on our <Link href="/contact" className="doc-link">Contact</Link> page.
        </p>
      </section>
    </div>
  );
}
