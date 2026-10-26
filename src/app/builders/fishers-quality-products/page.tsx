import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Fisher's Quality Products — one of our builders",
  description:
    "Fisher's Quality Products builds solid hardwood convertible cribs and case goods in Quarryville, Pennsylvania. Meet the Pennsylvania builder behind pieces Heirloom Cribs and More offers.",
  alternates: { canonical: '/builders/fishers-quality-products' },
  openGraph: { url: '/builders/fishers-quality-products' },
};

export default function FishersQualityProductsPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Our builders</p>
      <h1 className="headline-xl">Fisher&rsquo;s Quality Products</h1>
      <p className="body-lg doc-lede">
        Fisher&rsquo;s Quality Products is led by owner Joseph Z. Fisher in Quarryville, Lancaster
        County, Pennsylvania. Of the builders we work with, Fisher&rsquo;s is the one in Pennsylvania.
        Heirloom Cribs and More is also based in Pennsylvania, and Fisher&rsquo;s is the builder
        closest to us. Made in Pennsylvania.
      </p>

      <section>
        <h2 className="headline-md">What they make</h2>
        <p>
          Convertible cribs, conversion kits, changing tables that convert to dressers, chests and
          nightstands.
        </p>
        <p>
          Best-selling styles on file: the Darlington, Moyerton and Princeton convertible cribs, plus
          the Hartford 6- and 7-drawer changing dressers. Newer Hartford pieces include a 42&Prime; toy
          box, a 5-drawer chest and a 60&Prime; 7-drawer dresser.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Finishes</h2>
        <p>Fisher&rsquo;s stains come from Ohio Certified Stains (OCS).</p>
      </section>

      <section>
        <h2 className="headline-md">Lead time</h2>
        <p>About 10&ndash;14 weeks, confirmed when you order.</p>
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
