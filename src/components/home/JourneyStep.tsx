/**
 * One step of the buying journey, as a page section.
 *
 * The homepage IS the journey: hero, the provenance banner, then these four in
 * order. It is not a summary band any more, because the thing a made-to-order
 * shop most has to explain is the sequence - the checkout takes no card, the
 * invoice arrives later, and the piece is built over weeks. A visitor who does
 * not know that reads "Place order" as "charge my card now".
 *
 * Steps carry real content rather than describing it: step 01 holds the
 * products, step 04 reads its prices from the same constant the checkout
 * charges from. Copy that restates data drifts; copy that renders it cannot.
 */

interface Props {
  n: string;
  title: string;
  lead: string;
  children?: React.ReactNode;
}

export default function JourneyStep({ n, title, lead, children }: Props) {
  const id = `journey-${n}`;
  return (
    <section className="journey-step" aria-labelledby={id}>
      <div className="journey-step-head">
        <p className="label-caps journey-step-num">{n}</p>
        <h2 id={id} className="journey-step-title">
          {title}
        </h2>
        <p className="journey-step-lead">{lead}</p>
      </div>
      {children && <div className="journey-step-body">{children}</div>}
    </section>
  );
}
