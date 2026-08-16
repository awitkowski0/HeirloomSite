import Link from 'next/link';

/*
 * The four conversion stages, drawn rather than photographed.
 *
 * There is no photography of a converted bed anywhere in the catalogue - all
 * 531 product images are the same 3/4 studio shot of an assembled crib - so
 * showing this sequence at all means drawing it. Line art is also the honest
 * medium here: it says "this is how the product changes" rather than implying
 * a photograph of a room that does not exist.
 *
 * Each stage is a single 64x48 viewBox using stroke="currentColor" and no
 * fill, so the whole column inherits ink colour and stays crisp at any size
 * for about 3KB total.
 */

interface Stage {
  n: string;
  label: string;
  /** Drawn inside a 64x48 box, baseline (floor) at y=44. */
  art: React.ReactNode;
}

const FLOOR = 44;

/** Evenly spaced vertical slats between two x positions. */
function slats(x1: number, x2: number, top: number, bottom: number, count: number) {
  const step = (x2 - x1) / (count + 1);
  return Array.from({ length: count }, (_, i) => (
    <line key={i} x1={x1 + step * (i + 1)} y1={top} x2={x1 + step * (i + 1)} y2={bottom} />
  ));
}

const STAGES: Stage[] = [
  {
    n: '01',
    label: 'Crib',
    art: (
      <>
        {/* Four tall sides: full-height enclosure. */}
        <line x1="10" y1="12" x2="10" y2={FLOOR} />
        <line x1="54" y1="12" x2="54" y2={FLOOR} />
        <line x1="10" y1="12" x2="54" y2="12" />
        <line x1="10" y1="30" x2="54" y2="30" />
        {slats(10, 54, 12, 30, 7)}
        <line x1="10" y1={FLOOR} x2="54" y2={FLOOR} />
      </>
    ),
  },
  {
    n: '02',
    label: 'Toddler',
    art: (
      <>
        {/* One long side removed and replaced by a low guard rail. */}
        <line x1="10" y1="12" x2="10" y2={FLOOR} />
        <line x1="54" y1="20" x2="54" y2={FLOOR} />
        <line x1="10" y1="12" x2="24" y2="12" />
        <line x1="10" y1="30" x2="54" y2="30" />
        {slats(10, 24, 12, 30, 2)}
        {/* Guard rail: a short run, open at the foot end. */}
        <line x1="30" y1="22" x2="54" y2="22" />
        {slats(30, 54, 22, 30, 3)}
        <line x1="10" y1={FLOOR} x2="54" y2={FLOOR} />
      </>
    ),
  },
  {
    n: '03',
    label: 'Daybed',
    art: (
      <>
        {/* Back rail retained, front fully open. */}
        <line x1="10" y1="14" x2="10" y2={FLOOR} />
        <line x1="54" y1="26" x2="54" y2={FLOOR} />
        <line x1="10" y1="14" x2="54" y2="14" />
        <line x1="10" y1="30" x2="54" y2="30" />
        {slats(10, 54, 14, 30, 5)}
        <line x1="10" y1={FLOOR} x2="54" y2={FLOOR} />
      </>
    ),
  },
  {
    n: '04',
    label: 'Full bed',
    art: (
      <>
        {/* Headboard and footboard only, on a full-length frame. */}
        <line x1="8" y1="10" x2="8" y2={FLOOR} />
        <line x1="8" y1="10" x2="22" y2="10" />
        <line x1="22" y1="10" x2="22" y2="30" />
        {slats(8, 22, 10, 30, 2)}
        <line x1="56" y1="24" x2="56" y2={FLOOR} />
        <line x1="44" y1="24" x2="56" y2="24" />
        <line x1="44" y1="24" x2="44" y2="30" />
        <line x1="8" y1="30" x2="56" y2="30" />
        <line x1="8" y1={FLOOR} x2="56" y2={FLOOR} />
      </>
    ),
  },
];

export default function ConversionDiagram() {
  return (
    <div className="home-conversions">
      <p className="label-caps home-conversions-title">One crib, four beds</p>

      <ol className="home-conversion-list">
        {STAGES.map(stage => (
          <li key={stage.n} className="home-conversion">
            <svg
              className="home-conversion-art"
              viewBox="0 0 64 48"
              role="img"
              aria-label={`${stage.label} configuration`}
            >
              <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square">
                {stage.art}
              </g>
            </svg>
            <p className="label-caps home-conversion-label">
              <span className="home-conversion-num">{stage.n}</span>
              {stage.label}
            </p>
          </li>
        ))}
      </ol>

      {/*
        Points at the cribs, not at a kit category.
        
        This linked to /products/guard-rails-and-conversions until the kits
        became bundle-only; that URL now redirects to the full grid, which does
        not list them - so the one place on the homepage that talks about rails
        led somewhere they cannot be seen. The kits ship WITH the crib and are
        shown on its page, so that is where this belongs, and the label now says
        so rather than implying they are sold separately.
      */}
      <Link href="/products/cribs" className="home-conversions-link">
        Every crib includes its rails &rarr;
      </Link>
    </div>
  );
}
