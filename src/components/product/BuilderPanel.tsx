import Link from 'next/link';
import { featuresFor, missingStatementCopy, safetyAnswerFor, type Builder } from '@/lib/builders';

/* Under the product name: who built it, where, and their safety features. */
export function BuilderTag({ builder, category }: { builder: Builder; category: string | null }) {
  const { safety } = featuresFor(builder, category);
  return (
    <>
      <Link href={builder.href} className="builder-tag builder-tag--link">
        Built by {builder.name} · {builder.based}
      </Link>
      {safety.length > 0 && (
        <div className="builder-tag-safety">
          <span className="builder-tag">Safety, in {builder.name}&rsquo;s words</span>
          <ul className="feature-chips feature-chips--safety">
            {safety.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}
    </>
  );
}

/*
 * The builder's features at a glance, in the decision column. Each chip is the
 * builder's own wording (checked in tests/builders.test.ts) and the full quote
 * is one tap away, so a chip is never the only attribution on the page.
 */
export default function BuilderPanel({
  builder,
  category,
}: {
  builder: Builder;
  category: string | null;
}) {
  const safety = safetyAnswerFor(builder, category);
  const features = featuresFor(builder, category);

  return (
    <aside className="builder-origin" aria-label={`Made by ${builder.name}`}>
      {features.build.length > 0 && (
        <>
          <p className="label-caps builder-origin__label">How {builder.name} builds it</p>
          <ul className="feature-chips">
            {features.build.map(f => <li key={f}>{f}</li>)}
          </ul>
        </>
      )}

      {safety.kind !== 'not-applicable' && (
        <div className="builder-origin__safety">
          <p className="label-caps builder-origin__label">Safety, in {builder.name}&rsquo;s words</p>
          {safety.kind === 'statement' ? (
            <details>
              <summary>Read the builder&rsquo;s full statement</summary>
              <blockquote>
                <p>&ldquo;{safety.quote.text}&rdquo;</p>
                <cite>{safety.quote.source}</cite>
              </blockquote>
            </details>
          ) : (
            <p>
              {missingStatementCopy(builder.name)}{' '}
              <Link href="/contact" className="doc-link">Ask about this piece</Link>
            </p>
          )}
        </div>
      )}

      <p className="builder-origin__note">
        {builder.leadTime}, confirmed when you order. {builder.name} builds it, and Heirloom
        handles your order and delivery.
      </p>
    </aside>
  );
}
