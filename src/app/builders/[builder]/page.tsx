import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TalkToPerson from '@/components/layout/TalkToPerson';
import { formatPriceApprox } from '@/lib/format';
import { BUILDERS, type Builder, type BuilderQuote } from '@/lib/builders';
import { storeSections, type StoreSection } from '@/lib/builder-stores';
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';
import { getBrowsableProducts } from '@/lib/content';
import { roomImagesFor } from '@/lib/room-images';
import RoomRow from '@/components/marketing/RoomRow';

type Params = { builder: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { builder: id } = await params;
  const builder = BUILDERS.find(b => b.id === id);
  if (!builder) return {};
  const title = `${builder.name} Store | Heirloom Cribs & More`;
  const description = storeSections(builder).length > 0
    ? `Shop ${builder.name} at Heirloom Cribs & More: its collections, its story and how long each piece takes.`
    : `${builder.name} pieces, available on request from Heirloom Cribs & More.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: builder.href },
    openGraph: { title, description, url: builder.href },
    twitter: { title },
  };
}

const Quote = ({ quote, builder }: { quote: BuilderQuote; builder: Builder }) => (
  <blockquote className="store-quote">
    <p>&ldquo;{quote.text}&rdquo;</p>
    <cite>From {builder.name}</cite>
  </blockquote>
);

function SectionTile({ section, builder }: { section: StoreSection; builder: Builder }) {
  return (
    <li>
      <Link href={`${builder.href}/${section.slug}`} className="store-tile" data-product-name={section.name}>
        <span className="store-tile__photo">
          {section.image ? <Image src={section.image} alt="" fill sizes="(max-width: 859px) 92vw, 360px" /> : null}
        </span>
        <span className="store-tile__name">{section.name}</span>
        <span className="store-tile__meta">
          {section.count} {section.count === 1 ? 'piece' : 'pieces'} · From {formatPriceApprox(section.fromPrice)}
        </span>
      </Link>
    </li>
  );
}

export default async function StoreHome({ params }: { params: Promise<Params> }) {
  const { builder: id } = await params;
  const builder = BUILDERS.find(b => b.id === id);
  if (!builder) notFound();

  const sections = storeSections(builder);
  const rooms = getBrowsableProducts()
    .filter(p => p.builder === builder.id)
    .flatMap(p => roomImagesFor(p.slug).map(room => ({ ...room, href: `/product/${p.slug}`, name: p.productName })));
  const hasCollections = sections.some(s => s.kind === 'collection');
  const features = [...builder.buildFeatures.crib, ...builder.buildFeatures.caseGoods];
  const safety = [
    { heading: 'Cribs', quote: builder.safety.crib },
    { heading: 'Dressers and chests', quote: builder.safety.caseGoods },
  ].filter((s): s is { heading: string; quote: BuilderQuote } => s.quote !== null);

  return (
    <div className="store-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Our builders', path: '/builders' },
              { name: builder.name, path: builder.href },
            ]),
          ),
        }}
      />

      {sections.length > 0 ? (
        <section className="store-block" aria-labelledby="store-sections-heading">
          <h2 id="store-sections-heading">{hasCollections ? 'Collections' : 'Shop by piece'}</h2>
          <ul className="store-tiles">
            {sections.map(s => <SectionTile key={s.slug} section={s} builder={builder} />)}
          </ul>
        </section>
      ) : (
        <section className="store-block" aria-labelledby="store-ask-heading">
          <h2 id="store-ask-heading">Available on request</h2>
          <p>{`${builder.name} pieces are available on request. Tell us what you have in mind.`}</p>
          <p><TalkToPerson label="Ask by chat" piece={builder.name} /></p>
        </section>
      )}

      {rooms.length > 1 && (
        <section className="store-block" aria-labelledby="store-rooms-heading">
          <h2 id="store-rooms-heading">In the room</h2>
          <RoomRow items={rooms} label={`${builder.name} pieces in a room`} />
        </section>
      )}

      <section className="store-block" aria-labelledby="store-story-heading">
        <h2 id="store-story-heading">Their story</h2>
        <p>{`${builder.background}. Based in ${builder.based}.`}</p>
        {builder.story && builder.story.length > 0 ? (
          <blockquote className="store-quote">
            {builder.story.map(s => <p key={s.text}>&ldquo;{s.text}&rdquo;</p>)}
            <cite>From {builder.name}</cite>
          </blockquote>
        ) : null}
      </section>

      {(builder.construction || builder.setup || features.length > 0) && (
        <section className="store-block" aria-labelledby="store-built-heading">
          <h2 id="store-built-heading">How it&rsquo;s built</h2>
          {builder.construction ? (
            <Quote quote={builder.construction} builder={builder} />
          ) : features.length > 0 ? (
            <ul className="store-features">{features.map(f => <li key={f}>{f}</li>)}</ul>
          ) : null}
          {builder.setup ? <Quote quote={builder.setup} builder={builder} /> : null}
        </section>
      )}

      {safety.length > 0 && (
        <section className="store-block" aria-labelledby="store-statements-heading">
          <h2 id="store-statements-heading">Safety, from {builder.name}</h2>
          {safety.map(s => (
            <div key={s.heading} className="store-statement">
              <h3>{s.heading}</h3>
              <Quote quote={s.quote} builder={builder} />
            </div>
          ))}
        </section>
      )}

      <section className="store-block" aria-labelledby="store-time-heading">
        <h2 id="store-time-heading">How long it takes</h2>
        <p>{`${builder.leadTime}. We confirm it when you order.`}</p>
        <p>
          <Link href="/about-heirloom#how-an-order-works" className="link">How an order works</Link>
        </p>
      </section>
    </div>
  );
}
