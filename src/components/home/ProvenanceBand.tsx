/*
 * What "built better" means, in checkable terms, on the brand kit's dark band.
 * Brown maple is the site's existing material claim. The joinery lines are Old
 * Town Oak's catalog wording and are credited. "Made in USA" stays out: nothing
 * on file substantiates that FTC-regulated claim.
 */

const COLUMNS = [
  {
    icon: 'forest',
    label: 'Solid brown maple',
    lines: ['Solid brown maple hardwood,', 'never veneer over particle board.'],
  },
  {
    icon: 'handyman',
    label: 'Real joinery',
    lines: ['Mortise and tenon joints,', 'in Old Town Oak\u2019s words.'],
  },
  {
    icon: 'inventory_2',
    label: 'Dovetail drawers',
    lines: ['Dovetail wood drawer boxes,', 'in Old Town Oak\u2019s words.'],
  },
  {
    icon: 'chat_bubble',
    label: 'Safety from the builder',
    lines: ['Quoted from each builder,', 'never our own claim.'],
  },
];

export default function ProvenanceBand() {
  return (
    <section className="home-band">
      <p className="label-caps home-band-line">
        Full furniture. Built new to order.
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
