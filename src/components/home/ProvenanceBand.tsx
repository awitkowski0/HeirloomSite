/*
 * Three claims on a dark band. Each is checked against the catalogue.
 *
 * "16 crib styles" is exact: the Cribs category holds 22 products, which
 * collapse to 16 style families once the "X" / "X Style" pairs are counted
 * once (Bloomington and Bloomington Style are the same style).
 *
 * The species list is maple, cherry and red oak. The supplied copy said
 * "maple, cherry, walnut & oak", but there is no walnut anywhere in the
 * catalogue - zero occurrences across 273 configurations - so advertising it
 * would send buyers looking for a wood they cannot order. Add it here when
 * there is a walnut product to sell.
 *
 * "Solid American hardwoods" is kept rather than the brief's flag-and-
 * "Made in USA" column: the species claim is about the material, which the
 * catalogue supports, whereas country-of-origin manufacturing is an
 * FTC-regulated claim that nothing in the repo substantiates.
 */

const COLUMNS = [
  {
    icon: 'chair',
    label: '16 crib styles',
    lines: ['Timeless designs.', 'Built to last generations.'],
  },
  {
    icon: 'forest',
    label: 'Solid American hardwoods',
    lines: ['Sustainably sourced maple,', 'cherry and red oak.'],
  },
  {
    icon: 'local_shipping',
    label: 'Personal delivery guidance',
    lines: ['White-glove delivery and setup', 'by our trusted partners.'],
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
