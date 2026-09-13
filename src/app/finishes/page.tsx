import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Finishes & Nursery Air Quality',
  description:
    'What GREENGUARD Gold measures, how Heirloom describes finishes and emissions on live Care/Safety pages, and how to read claims without overstating certification.',
  alternates: { canonical: '/finishes' },
};

export default function FinishesPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">Finishes &amp; Nursery Air Quality</h1>
      <p className="body-lg doc-lede">
        The finish and emissions profile of a crib matter alongside the wood itself. This guide
        explains what GREENGUARD Gold means in general, how finish language appears on the cribs we
        offer, and how to read claims without overstating them.
      </p>
      <p>
        Heirloom Cribs and More is the <strong>reseller</strong>; Amish and independent US
        craftspeople make the hardwood case goods. We do not claim Heirloom applies the finish in our
        own factory.
      </p>

      <section>
        <h2 className="headline-md">What GREENGUARD Gold measures</h2>
        <p>
          GREENGUARD Gold is an independent, third-party certification issued by UL Solutions. It
          tests finished products for chemical emissions into indoor air, with a focus on volatile
          organic compounds (VOCs). The Gold level is the stricter of the two main GREENGUARD tiers
          and is designed for sensitive environments such as schools, healthcare settings, and
          nurseries.
        </p>
        <p>
          In practical terms, a GREENGUARD Gold–certified product has been tested in controlled
          chambers and shown to meet low emission limits (including a very low formaldehyde
          threshold). The certification addresses <strong>emissions</strong> — what is released into
          the air — rather than a full chemical-content inventory of every component. It does not
          replace structural safety standards such as CPSC crib requirements.
        </p>
      </section>
      <hr className="doc-rule" />
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
            : every finish we offer is <strong>non-toxic and baby-safe</strong>. Finishes are applied
            to solid wood (not printed on a laminate), so the grain shows through and no two pieces
            are identical — the same stain can read differently on brown maple than on red oak.
          </li>
          <li>
            <Link href="/safety" className="doc-link">
              Safety
            </Link>
            : finishes are non-toxic and baby-safe throughout, including on the top rails (where a
            teething child may put their mouth). Every crib we sell meets or exceeds CPSC and ASTM
            standards.
          </li>
        </ul>
        <p>
          Always confirm finish and any certification language on the <strong>specific product
          page</strong> before you order. We do not claim &ldquo;zero-VOC&rdquo; as an absolute for
          every finish.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Solid hardwood and finish: the complete system</h2>
        <p>
          Material and finish work together. Solid American hardwood (brown maple, cherry, red oak)
          plus a nursery-appropriate finish is the system parents are evaluating — not the wood alone.
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
          Yes — every finish we offer is non-toxic and baby-safe per our Care and Safety pages. If
          your child has a sensitivity, tell us the model you&rsquo;re considering before you order.
        </p>
        <h3>Can I choose wood species and stain?</h3>
        <p>
          Yes. Most cribs offer hardwood and stain options on the product page. Pick the silhouette
          first; the wood and the stain follow. Stain samples on product pages are photographs of the
          actual finish on the actual wood. If you&rsquo;re matching an existing piece, ask us before
          ordering.
        </p>
        <h3>Is every crib GREENGUARD Gold certified?</h3>
        <p>
          Do not assume that. Confirm any GREENGUARD or other certification on the specific product
          page and Safety page for the model you want. Our live Care/Safety pages today emphasize
          non-toxic, baby-safe finishes and CPSC/ASTM — not a blanket GREENGUARD claim.
        </p>
        <h3>Does GREENGUARD Gold mean zero chemicals?</h3>
        <p>
          No. It is a low-emission standard for what is released into indoor air, not a promise that a
          product is &ldquo;chemical-free.&rdquo;
        </p>
      </section>
      <section>
        <h2 className="headline-md">How to evaluate finish and emissions claims</h2>
        <ol className="doc-list">
          <li>
            Prefer specific certification names (when present on the product page) over vague
            &ldquo;eco-friendly&rdquo; alone.
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
