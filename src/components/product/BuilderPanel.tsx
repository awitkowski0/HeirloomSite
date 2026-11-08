import Link from 'next/link';
import { missingStatementCopy, safetyAnswerFor, type Builder } from '@/lib/builders';

/*
 * Who makes this piece and what they say about it, in the decision column.
 *
 * Server-rendered and handed to the configurator as part of its description
 * slot, so the builder and the statement are in the prerendered HTML.
 */
export default function BuilderPanel({
  builder,
  category,
}: {
  builder: Builder;
  category: string | null;
}) {
  const safety = safetyAnswerFor(builder, category);

  return (
    <aside className="builder-origin" aria-label={`Made by ${builder.name}`}>
      <p className="label-caps builder-origin__label">Who makes this</p>
      <p className="builder-origin__name">
        <Link href={builder.href}>{builder.name}</Link>
      </p>
      <p className="builder-origin__meta">
        {builder.based}. {builder.leadTime}, confirmed when you order.
      </p>
      <p className="builder-origin__note">
        {builder.name} builds it. Heirloom takes your order and handles delivery.
      </p>

      {safety.kind !== 'not-applicable' && (
        <div className="builder-origin__safety">
          <p className="label-caps builder-origin__label">Safety, from the builder</p>
          {safety.kind === 'statement' ? (
            <blockquote>
              <p>&ldquo;{safety.quote.text}&rdquo;</p>
              <cite>{safety.quote.source}</cite>
            </blockquote>
          ) : (
            <p>
              {missingStatementCopy(builder.name)}{' '}
              <Link href="/contact" className="doc-link">
                Ask about this piece
              </Link>
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
