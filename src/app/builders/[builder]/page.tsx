import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BuilderProducts from '@/components/builders/BuilderProducts';
import { BUILDERS, missingStatementCopy, type Builder, type BuilderQuote } from '@/lib/builders';

/*
 * The page for a builder whose record in data/builders/ is all there is. Every
 * line of the builder's voice comes from that record, each statement with its
 * source, and a missing statement shows as a gap. A builder with a hand-written
 * page under src/app/builders/<id>/ is excluded here; those folders win routing.
 */
export const dynamicParams = false;

type Params = { builder: string };

const generated = (): readonly Builder[] => BUILDERS.filter(b => !b.bespokePage);
const findBuilder = (id: string) => generated().find(b => b.id === id) ?? null;

export function generateStaticParams(): Params[] {
  return generated().map(b => ({ builder: b.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { builder: id } = await params;
  const builder = findBuilder(id);
  if (!builder) return {};
  const title = `${builder.name} | Heirloom Cribs & More`;
  return {
    title: { absolute: title },
    description: `${builder.name}, ${builder.based}. Read what the shop says about its work, in its own words, and order through Heirloom Cribs & More.`,
    alternates: { canonical: builder.href },
    openGraph: { title, url: builder.href },
    twitter: { title },
  };
}

function Statement({ heading, quote, builderName }: { heading: string; quote: BuilderQuote | null; builderName: string }) {
  return (
    <section>
      <h2 className="headline-md">{heading}</h2>
      {quote ? (
        <blockquote>
          <p>&ldquo;{quote.text}&rdquo;</p>
          <cite>{quote.source}</cite>
        </blockquote>
      ) : (
        <p>{missingStatementCopy(builderName)}</p>
      )}
    </section>
  );
}

export default async function BuilderPage({ params }: { params: Promise<Params> }) {
  const { builder: id } = await params;
  const builder = findBuilder(id);
  if (!builder) notFound();

  return (
    <div className="container">
      <header className="builder-header">
        <div className="builder-header__text">
          <p className="label-caps text-on-surface-variant">Our builders</p>
          <h1 className="headline-xl">{builder.name}</h1>
          <p className="body-lg builder-header__sub">
            {`${builder.background}. Based in ${builder.based}. You order through Heirloom Cribs & More, and we handle everything from the confirmation call to delivery day.`}
          </p>
          <Link href="/contact" className="button-primary">Get Personal Assistance</Link>
        </div>
        <div className="builder-panel">
          <blockquote>
            <p>&ldquo;{builder.intro.text}&rdquo;</p>
            <cite>{builder.intro.source}</cite>
          </blockquote>
        </div>
      </header>

      <BuilderProducts builderId={builder.id} />

      <div className="doc-page">
        <hr className="doc-rule" />
        <Statement heading="How it's built" quote={builder.construction} builderName={builder.name} />
        <Statement heading="Setting it up" quote={builder.setup} builderName={builder.name} />
        <Statement heading="Cribs, in its words" quote={builder.safety.crib} builderName={builder.name} />
        <Statement heading="Dressers and chests, in its words" quote={builder.safety.caseGoods} builderName={builder.name} />
        <section>
          <h2 className="headline-md">Lead time</h2>
          <p>{`${builder.leadTime}. We confirm it when you order.`}</p>
          <p>
            {`The full order steps are on `}
            <Link href="/about-heirloom#how-an-order-works" className="doc-link">About Heirloom</Link>
            {`.`}
          </p>
        </section>
      </div>
    </div>
  );
}
