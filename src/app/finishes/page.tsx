import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Finishes & Nursery Air Quality',
  description:
    'How finish language appears on the cribs Heirloom offers, why emissions matter in a nursery, and how to read finish claims without overstating them.',
  alternates: { canonical: '/finishes' },
  openGraph: { url: '/finishes' },
};

export default function FinishesPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">Finishes &amp; Nursery Air Quality</h1>
      <p className="body-lg doc-lede">
        The finish and emissions profile of a crib matter alongside the wood itself. This guide
        explains how finish language appears on the cribs we offer and how to read claims without
        overstating them.
      </p>
      <p>
        Heirloom Cribs and More is the <strong>reseller</strong>; Amish and independent US
        craftspeople make the hardwood case goods. We do not claim Heirloom applies the finish in our
        own factory.
      </p>

      <section>
        <h2 className="headline-md">Why emissions matter in a nursery</h2>
        <p>
          A crib is one of the few pieces of furniture a baby will be near for long periods while
          sleeping and resting. Lower chemical emissions from the finished piece can support cleaner
          indoor air in that small space. That is why many parents look for low-emission documentation
          when evaluating solid-wood nursery furniture.
        </p>
        <p>
          Solid hardwood construction already avoids the higher resin content typical of particle board
          or MDF. The finish system still contributes to the overall emissions profile.
        </p>
      </section>
      <section>
        <h2 className="headline-md">How Heirloom describes finishes today</h2>
        <p>On our live site:</p>
        <ul className="doc-list">
          <li>
            <Link href="/care" className="doc-link">
              Care &amp; Finishes
            </Link>
            : finishes are applied to solid wood (not printed on a laminate), so the grain shows
            through and no two pieces are identical — the same stain can read differently from one
            piece of brown maple to the next.
          </li>
        </ul>
        <p>
          Finish details come from each builder. Always confirm the finish on the <strong>specific
          product page</strong> before you order, and ask us for that builder&rsquo;s own
          documentation.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Solid hardwood and finish: the complete system</h2>
        <p>
          Material and finish work together. Solid American hardwood (brown maple)
          plus a finish is the system parents are evaluating — not the wood alone.
          See{' '}
          <Link href="/why-hardwood" className="doc-link">
            Why Solid Hardwood Matters
          </Link>
          .
        </p>
      </section>
      <section>
        <h2 className="headline-md">Practical questions</h2>
        <h3>Are the finishes safe for a nursery?</h3>
        <p>
          Finishes vary by builder, so we don&rsquo;t make one blanket claim for all of them. Tell
          us the model and finish you&rsquo;re considering and we&rsquo;ll point you to that
          builder&rsquo;s own documentation — especially if your child has a sensitivity.
        </p>
        <h3>Can I choose wood species and stain?</h3>
        <p>
          Yes. Most cribs offer hardwood and stain options on the product page. Pick the silhouette
          first; the wood and the stain follow. Stain samples on product pages are photographs of the
          actual finish on the actual wood. If you&rsquo;re matching an existing piece, ask us before
          ordering.
        </p>
      </section>
      <section>
        <h2 className="headline-md">How to evaluate finish and emissions claims</h2>
        <ol className="doc-list">
          <li>
            Prefer a builder&rsquo;s own, named finish details over vague &ldquo;eco-friendly&rdquo;
            alone.
          </li>
          <li>Read the Safety and Care pages alongside the product page.</li>
          <li>Ask us before deposit if a sensitivity or matching project needs a precise answer.</li>
          <li>
            Remember: structural safety (CPSC/ASTM) and finish/emissions language answer different
            questions.
          </li>
        </ol>
      </section>
    </div>
  );
}
