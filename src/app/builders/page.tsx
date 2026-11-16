import type { Metadata } from 'next';
import Link from 'next/link';
import BuilderDirectory from '@/components/builders/BuilderDirectory';
import { BUILDERS, missingStatementCopy, type BuilderQuote } from '@/lib/builders';

const TITLE = 'Shop by Builder | Heirloom Cribs & More';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description:
    'A store for each builder in our catalog: its collections, its story and how long each piece takes.',
  alternates: { canonical: '/builders' },
  openGraph: { title: TITLE, url: '/builders' },
  twitter: { title: TITLE },
};

function QuoteOrGap({ quote }: { quote: BuilderQuote | null }) {
  if (!quote) return <span className="builder-compare__gap">Ask us</span>;
  return <>&ldquo;{quote.text}&rdquo;</>;
}

function Statement({ heading, quote, name }: { heading: string; quote: BuilderQuote | null; name: string }) {
  return (
    <div className="builder-statement">
      <h4 className="label-caps">{heading}</h4>
      {quote ? (
        <blockquote>
          <p>&ldquo;{quote.text}&rdquo;</p>
          <cite>{quote.source}</cite>
        </blockquote>
      ) : (
        <p>{missingStatementCopy(name)}</p>
      )}
    </div>
  );
}

export default function BuildersPage() {
  return (
    <div className="container builders-index">
      <header className="builders-index__intro">
        <h1 className="headline-xl">Shop by builder</h1>
        <p className="body-lg">Each builder has a store here, with its collections and its story.</p>
      </header>

      <BuilderDirectory />

      <section aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="headline-md">Side by side</h2>
        <div className="builder-compare" tabIndex={0} role="region" aria-labelledby="compare-heading">
          <table>
            <thead>
              <tr>
                <td />
                {BUILDERS.map(b => (
                  <th key={b.id} scope="col">
                    <Link href={b.href} className="builder-name">{b.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Based in</th>
                {BUILDERS.map(b => <td key={b.id}>{b.based}</td>)}
              </tr>
              <tr>
                <th scope="row">Background</th>
                {BUILDERS.map(b => <td key={b.id}>{b.background}</td>)}
              </tr>
              <tr>
                <th scope="row">How it&rsquo;s built</th>
                {BUILDERS.map(b => <td key={b.id}><QuoteOrGap quote={b.construction} /></td>)}
              </tr>
              <tr>
                <th scope="row">Setting it up</th>
                {BUILDERS.map(b => <td key={b.id}><QuoteOrGap quote={b.setup} /></td>)}
              </tr>
              <tr>
                <th scope="row">Lead time</th>
                {BUILDERS.map(b => <td key={b.id}>{b.leadTime}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="safety-heading">
        <h2 id="safety-heading" className="headline-md" style={{ scrollMarginTop: 'calc(var(--header-h) + 16px)' }}>Safety, builder by builder</h2>
        <p>
          Each statement below is the builder&rsquo;s,
          quoted from its own materials, and each product page shows the one that applies to it.
        </p>
        <div className="builder-statements">
          {BUILDERS.map(b => (
            <article key={b.id} className="builder-statement-group">
              <h3 className="builder-entry__name"><Link href={b.href} className="builder-name">{b.name}</Link></h3>
              <Statement heading="Cribs" quote={b.safety.crib} name={b.name} />
              <Statement heading="Dressers and chests" quote={b.safety.caseGoods} name={b.name} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
