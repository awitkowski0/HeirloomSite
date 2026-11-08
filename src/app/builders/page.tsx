import type { Metadata } from 'next';
import Link from 'next/link';
import BuilderDirectory from '@/components/builders/BuilderDirectory';
import { BUILDERS, missingStatementCopy, type BuilderQuote } from '@/lib/builders';

const TITLE = 'Compare the Builders | Heirloom Cribs & More';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description:
    'Heirloom does not build furniture. Compare the independent workshops that do: where they are, how they build, and what each one says in its own words.',
  alternates: { canonical: '/builders' },
  openGraph: { title: TITLE, url: '/builders' },
  twitter: { title: TITLE },
};

const NOT_ON_FILE = 'Nothing on file yet';

function QuoteOrGap({ quote }: { quote: BuilderQuote | null }) {
  if (!quote) return <span className="builder-compare__gap">{NOT_ON_FILE}</span>;
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
        <p className="label-caps text-on-surface-variant">The builders</p>
        <h1 className="headline-xl">We don&rsquo;t build furniture. These shops do.</h1>
        <p className="body-lg">
          Heirloom Cribs &amp; More finds independent workshops, then handles everything between you
          and them. Here is who they are and how they compare, in their own words wherever we
          can quote them.
        </p>
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
                    <Link href={b.href}>{b.name}</Link>
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
        <h2 id="safety-heading" className="headline-md">Safety, builder by builder</h2>
        <p>
          Heirloom makes no safety claims of its own. Each statement below is the builder&rsquo;s,
          quoted from its own materials, and each product page shows the one that applies to it.
        </p>
        <div className="builder-statements">
          {BUILDERS.map(b => (
            <article key={b.id} className="builder-statement-group">
              <h3 className="headline-sm">{b.name}</h3>
              <Statement heading="Cribs" quote={b.safety.crib} name={b.name} />
              <Statement heading="Dressers and chests" quote={b.safety.caseGoods} name={b.name} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
