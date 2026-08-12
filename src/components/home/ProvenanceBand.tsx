/*
 * Three claims on a dark band, each one the site can actually back.
 *
 * The brief asked for a flag icon and an American-made column. That is an
 * FTC-regulated claim ("Made in USA" requires that all or virtually all of the
 * product be of US origin) and nothing in the repo substantiates it, so the
 * third column is made-to-order lead time instead, which is documented in the
 * configurator and in the pricing module. Swap it back once the origin claim
 * can be evidenced.
 */

const COLUMNS = [
  {
    icon: 'forest',
    label: 'Solid hardwood',
    lines: [
      'Brown maple, cherry and red oak.',
      'No veneer over particle board.',
    ],
  },
  {
    icon: 'build',
    label: 'Made to order',
    lines: [
      'Built after you order, not pulled',
      'from a warehouse. Six to eight weeks.',
    ],
  },
  {
    icon: 'local_shipping',
    label: 'Flat-rate delivery',
    lines: [
      '$150 anywhere in the continental US,',
      'however large the piece.',
    ],
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
