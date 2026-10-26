import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Kid's Comfort — one of our builders",
  description:
    "Kid's Comfort builds solid hardwood cribs and transitional children's furniture in Sugarcreek, Ohio. Meet the builder behind pieces Heirloom Cribs and More offers, made in the USA.",
  alternates: { canonical: '/builders/kids-comfort' },
  openGraph: { url: '/builders/kids-comfort' },
};

export default function KidsComfortPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Our builders</p>
      <h1 className="headline-xl">Kid&rsquo;s Comfort</h1>
      <p className="body-lg doc-lede">
        Kid&rsquo;s Comfort is led by owner Joe Troyer in Sugarcreek, Ohio. They build furniture meant
        to carry a child from the crib through the teen years, made in the USA.
      </p>

      <section>
        <h2 className="headline-md">What they make</h2>
        <p>
          Cribs (panel, slat and economy styles), dressers, chests, changers, changing towers,
          bookcases, nightstands and a panel bed, in collections including Mission, Shaker and
          Traditional (with a convertible chest, changer and wardrobe).
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Finish and quality check</h2>
        <p>
          Kid&rsquo;s Comfort finishes its pieces in-house, and each piece ships with a signed
          quality-control form. The stains come from Ohio Certified Stains (OCS).
        </p>
      </section>

      <section>
        <h2 className="headline-md">Lead time</h2>
        <p>About 8 weeks, confirmed when you order.</p>
      </section>

      <section>
        <h2 className="headline-md">Ordering through Heirloom</h2>
        <p>
          Every piece is made to order. We confirm your details, then take a 50% deposit. You can
          cancel at no cost any time before the deposit is paid; once it&rsquo;s paid, the order goes
          to the builder and can&rsquo;t be cancelled, and made-to-order pieces can&rsquo;t be
          returned. Delivery is charged by cart total: Curbside (drop-off) or White Glove, which is
          the only option that includes assembly. See{' '}
          <Link href="/shipping" className="doc-link">Delivery</Link> and{' '}
          <Link href="/returns" className="doc-link">Returns &amp; Cancellations</Link> for full
          terms.
        </p>
      </section>
    </div>
  );
}
