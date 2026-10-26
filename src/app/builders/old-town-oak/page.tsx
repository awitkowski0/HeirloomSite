import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Old Town Oak — one of our builders',
  description:
    'Old Town Oak builds solid hardwood cribs and case goods in Topeka, Indiana. Meet the builder behind many of the pieces Heirloom Cribs and More offers, made in the USA.',
  alternates: { canonical: '/builders/old-town-oak' },
  openGraph: { url: '/builders/old-town-oak' },
};

export default function OldTownOakPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Our builders</p>
      <h1 className="headline-xl">Old Town Oak</h1>
      <p className="body-lg doc-lede">
        Old Town Oak is a furniture shop in Topeka, Indiana, owned by Marlin Miller, building since
        2005. Heirloom Cribs and More is a Pennsylvania-based reseller &mdash; we don&rsquo;t build the
        furniture ourselves. Old Town Oak builds it in Indiana, made in the USA, and we bring it to
        your nursery.
      </p>

      <section>
        <h2 className="headline-md">What they make</h2>
        <p>
          Cribs, matching dressers (many with a changing-box top option), chests, nightstands, and
          conversion add-ons (a toddler day bed and full bed) for their crib collections.
        </p>
        <p>
          Collections we have on file include Addison, French Country, Mackenzie, Newport and West
          Lake, plus the newer Willow, Carmen, Cheyenne, Cordova, Palisade and Tahoe.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Woods and finishes</h2>
        <p>
          Woods listed by the builder: sap cherry, cherry, red oak, brown soft maple, quarter-sawn
          white oak and grey elm. Maple is a wood, not a finish.
        </p>
        <p>
          Old Town Oak&rsquo;s stains come from Spectrum Finishing. The Brown Maple stain names in our
          files include Almond, Asbury-Brown, Carbon, Earthtone, Ebony, Harvest, Manchester,
          Michaels-Cherry, Natural and Sandstone.
        </p>
      </section>

      <section>
        <h2 className="headline-md">How it&rsquo;s built</h2>
        <p>Mortise-and-tenon cribs with steel inserts, and dovetailed dresser drawers.</p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Safety, in Old Town Oak&rsquo;s own words</h2>
        <p>
          The safety wording below is Old Town Oak&rsquo;s own, quoted from the builder&rsquo;s
          documents we hold on file. For the standards that apply to a specific piece, confirm the
          details on that product&rsquo;s page.
        </p>
        <p>
          Old Town Oak has third-party test reports from Bureau Veritas Consumer Products Services
          (Buffalo, NY) for its crib styles. Each report states the sample{' '}
          <q>MEETS</q> the listed requirements &mdash; for example,{' '}
          <q>The requirements of 16 CFR Part 1219, &lsquo;Safety Standard for Full-Size Baby
          Cribs&rsquo;</q> (and, on several reports, ASTM F1169).
        </p>
        <p>
          For dressers, Old Town Oak&rsquo;s General Certificate of Conformity states:{' '}
          <q>
            Old Town Oak, LLC certifies that the above product complies with the following regulation
            standards: ASTM F2057-23 &ndash; Standard Safety Specification for Clothing Storage units.
            ASTM F3096-23 - Furniture Tipping Restraint 16 CFR 1261 &ndash; Safety Standard for
            Clothing Storage Units
          </q>{' '}
          (that certificate covers the Monterey 6-drawer dresser). Their STURDY Act notice says:{' '}
          <q>Interlocks on all products, and counterweights as needed. (Nightstands are exempt)</q>.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Lead time</h2>
        <p>About 6&ndash;8 weeks, confirmed when you order.</p>
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
