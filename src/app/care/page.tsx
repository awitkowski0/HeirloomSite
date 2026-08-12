import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Care & Finishes',
  description:
    'How to clean and care for solid hardwood nursery furniture, what to expect from the finishes, delivery and lead times, and what to do if something arrives damaged.',
  alternates: { canonical: '/care' },
};

export default function CarePage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">Care &amp; Finishes</h1>
      <p className="body-lg doc-lede">
        Solid wood behaves differently from the furniture most of us grew up replacing. It moves,
        it marks, and it can be repaired. Treated reasonably, it outlasts the child it was bought
        for.
      </p>

      <section>
        <h2 className="headline-md">Everyday cleaning</h2>
        <ul className="doc-list">
          <li>Dust with a dry or barely damp soft cloth, following the grain.</li>
          <li>
            Wipe spills as they happen. Standing liquid is the one thing that will genuinely damage
            a finish.
          </li>
          <li>
            Skip all-purpose sprays, ammonia, bleach and silicone-based polishes. They dull the
            finish over time and make later refinishing harder.
          </li>
          <li>
            No abrasive pads. A tooth-mark on a top rail is easier to live with than a scrubbed
            patch of bare wood.
          </li>
        </ul>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">What the wood will do</h2>
        <p>
          Hardwood expands and contracts with humidity, and this is expected rather than a defect.
          A panel may show a hairline seam in a dry winter and close it again by summer. Keeping
          the room roughly between 35% and 55% relative humidity keeps that movement small.
        </p>
        <p>
          Colour also shifts. Cherry in particular darkens and warms noticeably in its first year
          in daylight; maple and oak move less. If a piece is partly covered by something for
          months, expect a visible line when you move it — rotating what sits on top evens this out.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Hardware</h2>
        <p>
          Re-tighten the bolts a few weeks after assembly, then every few months. Wood movement
          loosens fasteners, and a crib gets shaken more than any other piece of furniture in the
          house. Hand-tighten only — over-torquing strips the insert.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Delivery and lead time</h2>
        <p>
          Pieces are built after you order rather than pulled from a warehouse, so expect roughly
          six to eight weeks before delivery. Shipping is a flat $150 within the continental United
          States.
        </p>
        <p>
          Inspect the piece before you assemble it. If anything is damaged in transit, photograph
          it and{' '}
          <Link href="/contact" className="doc-link">
            contact us
          </Link>{' '}
          before assembly — it is far easier to resolve at that point than after the piece is
          built.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Finishes</h2>
        <p>
          Every finish we offer is non-toxic and baby-safe. Because they are applied to solid wood
          rather than printed on a laminate, the grain shows through and no two pieces are
          identical — the same stain reads differently on brown maple than on red oak.
        </p>
        <p>
          Stain samples on the product pages are photographs of the actual finish on the actual
          wood, so a finish shown on one species will look different on another. If you are
          matching an existing piece, ask us before ordering.
        </p>
        <p>
          <Link href="/products" className="doc-link">
            Browse the collection →
          </Link>
        </p>
      </section>
    </div>
  );
}
