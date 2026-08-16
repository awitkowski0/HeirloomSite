import type { Metadata } from 'next';
import Link from 'next/link';

/*
 * IMPORTANT, for whoever maintains this page:
 *
 * Crib safety claims are regulated. In the US, full-size and non-full-size
 * cribs are covered by 16 CFR 1219 and 1220, and "meets or exceeds CPSC and
 * ASTM standards" is a substantiable claim, not marketing colour.
 *
 * This page does not introduce that claim - it restates one the catalogue
 * already makes. 180 of the product descriptions in inventory.json contain
 * sentences like "rigorously tested to exceed CPSC and ASTM standards", so
 * the exposure already exists across every product page. Confirm you hold
 * the test reports from the manufacturer that back it. If you do not, the
 * wording to change is in the product data, not only here.
 *
 * CERTIFICATIONS is empty on purpose. Add entries only for programmes you
 * can evidence; the section renders nothing while the list is empty rather
 * than showing an unsupported badge.
 */
const CERTIFICATIONS: { name: string; detail: string }[] = [];

export const metadata: Metadata = {
  title: 'Safety',
  description:
    'How our cribs are built, the standards they are tested to, the finishes we use, and safe-sleep guidance for setting up the nursery.',
  alternates: { canonical: '/safety' },
};

export default function SafetyPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">Safety</h1>
      <p className="body-lg doc-lede">
        A crib is the one piece of furniture your child is left alone in. Here is what ours are
        built from, what they are tested against, and how to set one up so it stays safe as your
        child grows.
      </p>

      <section>
        <h2 className="headline-md">Standards</h2>
        <p>
          Every crib we sell is built to meet or exceed the CPSC and ASTM safety standards that
          govern cribs sold in the United States, and is finished with non-toxic, baby-safe
          materials. Cribs are among the most tightly regulated pieces of furniture sold in the
          US: fixed sides, slat strength and spacing, mattress support and hardware durability are
          all covered.
        </p>
        {CERTIFICATIONS.length > 0 && (
          <ul className="doc-list">
            {CERTIFICATIONS.map(c => (
              <li key={c.name}>
                <strong>{c.name}</strong> — {c.detail}
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Materials and construction</h2>
        <p>
          Our cribs are made from solid American hardwood — brown maple, cherry and red oak — not
          veneer over particle board. Drawers in the matching case pieces are dovetailed rather
          than stapled. Solid wood matters here for a specific reason: a crib is repeatedly
          disassembled and rebuilt as it converts, and joinery that holds up to that is the
          difference between a piece that lasts one child and one that lasts several.
        </p>
        <p>
          Finishes are non-toxic and baby-safe throughout, including on the top rails, which is
          where a teething child will inevitably put their mouth.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Setting up safely</h2>
        <ul className="doc-list">
          <li>
            <strong>Mattress fit.</strong> Use a firm, flat mattress sized for the crib. If you can
            fit more than two fingers between the mattress and the crib side, the mattress is too
            small.
          </li>
          <li>
            <strong>Keep the sleep surface bare.</strong> Current safe-sleep guidance from the
            American Academy of Pediatrics is a firm mattress with a fitted sheet and nothing else
            — no bumpers, pillows, blankets, or soft toys.
          </li>
          <li>
            <strong>Lower the mattress as your child grows.</strong> Drop to the lowest setting
            before they can pull to standing.
          </li>
          <li>
            <strong>Re-tighten the hardware.</strong> Check the bolts a few weeks after assembly
            and every few months after. Wood moves with the seasons and fasteners loosen; this is
            normal and is the single most useful bit of maintenance you can do.
          </li>
          <li>
            <strong>Placement.</strong> Keep the crib clear of windows, blind or curtain cords,
            heaters and anything hanging on the wall within reach.
          </li>
        </ul>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Converting the crib</h2>
        <p>
          Our convertible cribs move through four stages — crib, toddler bed, daybed, and full-size
          bed. The conversion parts are sold separately, so you buy them when you reach that stage
          rather than storing them for two years.
        </p>
        <p>
          Convert on the child&rsquo;s readiness, not their age: most families move to the toddler
          bed when climbing out of the crib becomes a real possibility. Use the guard rail made for
          your model — the geometry differs between styles.
        </p>
        <p>
          {/* The kits are listed on each crib's own page, not as a category:
              they ship with the crib and are already in its price. */}
          <Link href="/products/cribs" className="doc-link">
            See which rails come with each crib →
          </Link>
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Questions</h2>
        <p>
          If anything arrives damaged, or a part does not fit as it should, tell us before you
          assemble it.{' '}
          <Link href="/contact" className="doc-link">
            Get in touch
          </Link>{' '}
          and we will sort it out.
        </p>
      </section>
    </div>
  );
}
