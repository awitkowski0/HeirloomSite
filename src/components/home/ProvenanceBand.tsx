/*
 * Four claims on a dark band, mapped to the brand kit's messaging pillars.
 * Each is checked against the catalogue - none of these are new claims, all
 * four already appear elsewhere on the site.
 *
 * Forest to Family Provenance -> the species list is maple, cherry and red
 * oak. The brief's copy said "maple, cherry, walnut & oak", but there is no
 * walnut anywhere in the catalogue - zero occurrences across 273
 * configurations - so advertising it would send buyers looking for a wood
 * they cannot order. Add it here when there is a walnut product to sell.
 * "Solid American hardwoods" is kept rather than a "Made in USA" claim:
 * the species claim is about the material, which the catalogue supports,
 * whereas country-of-origin manufacturing is an FTC-regulated claim that
 * nothing in the repo substantiates.
 *
 * Certified Nursery Safety -> the kit's own phrasing ("Certified Safe:
 * Exceeds all safety standards") is looser than what this codebase will
 * ship. Reusing the exact wording already used on /safety instead - see
 * src/app/safety/page.tsx, which restates a claim the catalogue already
 * makes in 180 product descriptions and requires the seller to hold the
 * test reports backing it. Do not strengthen this wording without
 * confirming those reports exist.
 *
 * Effortless White-Glove Care -> unchanged from the original delivery
 * claim; substantiated by the same tiers charged at checkout.
 *
 * Grows As They Grow -> replaces the previous "16 crib styles" claim, which
 * was a weaker fit for this pillar than the crib's actual convertibility.
 * Substantiated by HomeHero's own subcopy and ConversionDiagram's 4-stage
 * crib -> toddler bed -> daybed -> full bed sequence.
 */

const COLUMNS = [
  {
    icon: 'forest',
    label: 'Solid American hardwoods',
    lines: ['Sustainably sourced maple,', 'cherry and red oak.'],
  },
  {
    icon: 'verified',
    label: 'CPSC & ASTM tested',
    lines: ['Every crib meets or exceeds', 'CPSC and ASTM safety standards.'],
  },
  {
    icon: 'local_shipping',
    label: 'Personal delivery guidance',
    lines: ['Threshold or white-glove delivery', 'by our trusted partners.'],
  },
  {
    icon: 'sync_alt',
    label: 'Grows with your child',
    lines: ['One crib converts to a toddler', 'bed, a daybed and a full bed.'],
  },
];

export default function ProvenanceBand() {
  return (
    <section className="home-band">
      <p className="label-caps home-band-line">
        Not vintage. Newly crafted to current standards.
      </p>

      <ul className="home-band-cols">
        {COLUMNS.map(col => (
          <li key={col.label} className="home-band-col">
            <span className="material-symbols-outlined home-band-icon" aria-hidden="true">
              {col.icon}
            </span>
            <p className="label-caps home-band-label">{col.label}</p>
            <p className="home-band-copy">
              {col.lines.map(line => (
                <span key={line}>{line}</span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
