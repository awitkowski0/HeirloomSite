import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Why Solid Hardwood Matters',
  description:
    'What solid hardwood means for crib strength, longevity through conversion, finish behavior, and evaluating materials—US-made Heirloom cribs from Amish and independent craftspeople.',
  alternates: { canonical: '/why-hardwood' },
};

export default function HardwoodPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">Why Solid Hardwood Matters</h1>
      <p className="body-lg doc-lede">
        When you choose a crib, the material affects how it feels, how it holds up through daily use,
        how the finish behaves, and whether the piece can convert and serve another child or
        generation.
      </p>
      <p>
        The hardwood cribs we offer are solid American hardwood — brown maple, cherry, and red oak —
        not veneer over particle board. Heirloom Cribs and More is the <strong>reseller</strong>; Amish
        and independent US craftspeople make the case goods.
      </p>

      <section>
        <h2 className="headline-md">What &ldquo;solid hardwood&rdquo; means</h2>
        <p>
          Solid hardwood means the structural parts of the crib — rails, posts, side panels, and key
          frame members — are made from solid pieces of hardwood rather than particle board, MDF,
          plywood cores with a thin veneer, or other engineered composites.
        </p>
        <p>
          Particle board and MDF are made from wood particles or fibers bound with resin. Solid
          hardwood starts as sawn lumber and is shaped into the components that form the crib. That
          construction difference shows up over time in rigidity, weight, and the ability to refinish
          or repair.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Strength and daily durability</h2>
        <p>
          A crib is shaken, leaned on, and taken apart when it converts. Solid hardwood gives the
          frame the mass and rigidity to stay true through that use. Our{' '}
          <Link href="/safety" className="doc-link">
            Safety
          </Link>{' '}
          page notes that solid wood matters specifically because a convertible crib is repeatedly
          disassembled and rebuilt — joinery that holds up is the difference between a piece that lasts
          one child and one that lasts several.
        </p>
      </section>
      <section>
        <h2 className="headline-md">Longevity and the convertible path</h2>
        <p>
          One solid hardwood frame can move through crib → toddler bed → daybed → full-size bed when
          the kits for your style are in place. That&rsquo;s what we mean by Built to Grow Up. Rails
          and separately sold conversion parts are confirmed on the product page and on the Confirm
          Order call — see{' '}
          <Link href="/how-conversion-works" className="doc-link">
            How Our 4-in-1 Conversion Works
          </Link>
          .
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Material profile and nursery air quality</h2>
        <p>
          Solid hardwood itself does not rely on the same volume of binding resins used in particle
          board or MDF. Finishes still matter. Every finish we offer is non-toxic and baby-safe,
          including on the top rails (
          <Link href="/safety" className="doc-link">
            Safety
          </Link>
          ;{' '}
          <Link href="/care" className="doc-link">
            Care &amp; Finishes
          </Link>
          ). For more on finishes and emissions language, see{' '}
          <Link href="/finishes" className="doc-link">
            Finishes &amp; Nursery Air Quality
          </Link>
          .
        </p>
      </section>
      <section>
        <h2 className="headline-md">Made in the USA — reseller, not factory</h2>
        <p>
          The cribs we sell are made in the USA by Amish and independent US craftspeople. Heirloom
          Cribs and More is a women-owned business based in Nazareth, Pennsylvania (Lehigh Valley) —
          we offer and support these pieces; we are not the factory.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Practical questions</h2>
        <h3>Do solid hardwood cribs weigh more?</h3>
        <p>
          Yes. Solid hardwood cribs generally weigh more than particle-board or thin-veneer
          alternatives.
        </p>
        <h3>Can the finish be refreshed later?</h3>
        <p>
          Solid wood can often be refinished in ways engineered boards cannot. Ask us before you
          attempt any refinishing so we can point you to care guidance that won&rsquo;t void what you
          expect from the finish.
        </p>
        <h3>Where do I see the safety standards?</h3>
        <p>
          On our{' '}
          <Link href="/safety" className="doc-link">
            Safety
          </Link>{' '}
          page: every crib we sell is built to meet or exceed CPSC and ASTM standards, with non-toxic,
          baby-safe finishes. Confirm details on the specific product page.
        </p>
      </section>
      <section>
        <h2 className="headline-md">How to evaluate a crib&rsquo;s materials</h2>
        <ol className="doc-list">
          <li>Look for clear solid-hardwood language (species named) rather than vague &ldquo;wood&rdquo; alone.</li>
          <li>Check whether the brand discloses particle board, MDF, or veneer use.</li>
          <li>Review the Safety page for CPSC/ASTM and finish claims that apply to that model.</li>
          <li>Ask how conversion works and what&rsquo;s included vs sold separately.</li>
        </ol>
        <p>
          If you&rsquo;re weighing two styles, ask us before you put a deposit down — we&rsquo;ll walk
          you through what&rsquo;s in each one.
        </p>
      </section>
    </div>
  );
}
