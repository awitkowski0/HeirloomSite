/*
 * Four claims on a dark band, mapped to the brand kit's messaging pillars.
 * Each is checked against the catalogue - none of these are new claims, all
 * four already appear elsewhere on the site.
 *
 * Forest to Family Provenance -> the species is brown maple: the base wood
 * column in every builder's price book (OTO "Brown Maple (unfinished)", FQP
 * "Maple/Oak", KC "Oak, B.Maple, Sap Cherry") and the only wood the shop
 * sells (Cherry Wood and Red Oak variants are hidden in build-data). The
 * brief's copy said "maple, cherry, walnut & oak"; advertising a wood the
 * catalogue does not sell sends buyers looking for something they cannot
 * order. Add a species here when there is a product in it to sell.
 * "Solid brown maple" is kept rather than a "Made in USA" claim:
 * the species claim is about the material, which the catalogue supports,
 * whereas country-of-origin manufacturing is an FTC-regulated claim that
 * nothing in the repo substantiates.
 *
 * Solid hardwood, made to order -> replaces the previous "CPSC & ASTM tested /
 * meets or exceeds safety standards" column. Per brand rule, Heirloom does not
 * make its own safety-standard claims; that wording belongs to the builders'
 * own sourced words. This column restates the material claim (solid hardwood,
 * no veneer / particle board) already made elsewhere on the site.
 *
 * Effortless White-Glove Care -> unchanged from the original delivery
 * claim; substantiated by the same tiers charged at checkout.
 *
 * Grows As They Grow -> replaces the previous "16 crib styles" claim, which
 * was a weaker fit for this pillar than the crib's actual convertibility.
 * Substantiated by HomeHero's own subcopy and ConversionDiagram's 4-stage
 * crib -> toddler bed -> full bed sequence.
 */

const COLUMNS = [
  {
    icon: 'handyman',
    label: 'A named builder',
    lines: ['Every crib and dresser names', 'the shop that makes it.'],
  },
  {
    icon: 'forest',
    label: 'Solid brown maple, made to order',
    lines: ['Built new for your nursery.', 'No veneer, no particle board.'],
  },
  {
    icon: 'chat_bubble',
    label: 'Safety in the builder\u2019s words',
    lines: ['Quoted from each builder,', 'piece by piece. Never our own claim.'],
  },
  {
    icon: 'local_shipping',
    label: 'One team to delivery',
    lines: ['We handle the order, the calls,', 'the invoice, and the delivery.'],
  },
];

export default function ProvenanceBand() {
  return (
    <section className="home-band">
      <p className="label-caps home-band-line">
        Not a manufacturer. A guide to the people who are.
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
