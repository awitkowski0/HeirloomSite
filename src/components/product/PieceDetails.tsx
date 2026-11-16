import Link from 'next/link';
import { missingStatementCopy, safetyAnswerFor, type Builder } from '@/lib/builders';
import { formatPriceApprox } from '@/lib/format';
import { shortBuilderName } from '@/lib/names';
import type { RelatedProduct } from '@/types';

const STATED_WOOD = ['Cribs', 'Mini Cribs', 'Dressers', 'Chests', 'Nightstands', 'Changing Tables'];

/* Why it costs what it does, using only what is actually known about it. */
export default function PieceDetails({
  builder,
  category,
  price,
  bundle,
}: {
  builder: Builder | null;
  category: string | null;
  price: number;
  bundle: readonly RelatedProduct[];
}) {
  const safety = builder ? safetyAnswerFor(builder, category) : null;
  const short = builder ? shortBuilderName(builder.name) : '';
  const toddler = bundle.find(b => /toddler/i.test(b.productName));
  const full = bundle.find(b => /full bed/i.test(b.productName));
  const hasWood = category !== null && STATED_WOOD.includes(category);

  return (
    <>
      {(builder || hasWood) && (
        <section className="detail" id="why">
          <h2>Why {formatPriceApprox(price)}?</h2>
          <ul>
            {builder && <li>{short} builds it after you order. {builder.leadTime}, and we confirm that when you order.</li>}
            {hasWood && <li>Solid brown maple, with no veneer or particle board.</li>}
            {builder?.construction ? (
              <li>
                <blockquote>“{builder.construction.text}”<cite>{builder.construction.source}</cite></blockquote>
              </li>
            ) : builder ? (
              <li>Ask us how {short} builds this, and we’ll find out.</li>
            ) : null}
            <li>We don’t have close-up photos of the joints yet.</li>
          </ul>
          {toddler && full && (
            <dl className="sum">
              <div><dt>The crib</dt><dd>{formatPriceApprox(price)}</dd></div>
              <div><dt>Toddler bed kit</dt><dd>{formatPriceApprox(toddler.price)}</dd></div>
              <div><dt>Full bed kit</dt><dd>{formatPriceApprox(full.price)}</dd></div>
              <div className="sum-total"><dt>All three beds</dt><dd>{formatPriceApprox(price + toddler.price + full.price)}</dd></div>
            </dl>
          )}
        </section>
      )}

      {builder && (
        <section className="detail">
          <h2>Who makes it</h2>
          <blockquote>“{builder.intro.text}”<cite>{builder.intro.source}</cite></blockquote>
          <p className="small"><Link href={builder.href} className="builder-name">{builder.name}</Link>, {builder.based}.</p>
        </section>
      )}

      {builder && safety && safety.kind !== 'not-applicable' && (
        <section className="detail">
          <h2>Safety, from {short}</h2>
          {safety.kind === 'statement' ? (
            <blockquote>“{safety.quote.text}”<cite>{safety.quote.source}</cite></blockquote>
          ) : (
            <p>{missingStatementCopy(short)}</p>
          )}
        </section>
      )}
    </>
  );
}
