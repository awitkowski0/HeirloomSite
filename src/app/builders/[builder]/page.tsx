import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BUILDER_CONTENT } from '@/components/builders/content';
import RoomSection from '@/components/marketing/RoomSection';
import { roomImagesFor } from '@/lib/room-images';
import { builderById, type Builder } from '@/lib/builders';
import { storeProducts, storeSections, type StoreSection } from '@/lib/builder-stores';
import { formatPriceApprox } from '@/lib/format';
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';

type Params = { builder: string };

/* The old per-builder page's metadata, unchanged: same title, canonical and description. */
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { builder: id } = await params;
  return BUILDER_CONTENT[id]?.metadata ?? {};
}

function SectionTile({ section, builder }: { section: StoreSection; builder: Builder }) {
  return (
    <li>
      <Link href={`${builder.href}/${section.slug}`} className="store-tile">
        <span className="store-tile__photo">
          {section.image ? <Image src={section.image} alt="" fill sizes="(max-width: 767px) 46vw, 260px" /> : null}
        </span>
        <span className="store-tile__name">{section.name}</span>
        <span className="store-tile__meta">
          {section.count} {section.count === 1 ? 'piece' : 'pieces'} · From {formatPriceApprox(section.fromPrice)}
        </span>
      </Link>
    </li>
  );
}

/*
 * The store home: the builder's collections (or piece types) as tiles, then
 * the old page's body, verbatim, as the builder's story.
 */
export default async function StoreHome({ params }: { params: Promise<Params> }) {
  const { builder: id } = await params;
  const builder = builderById(id);
  const content = BUILDER_CONTENT[id];
  if (!builder || !content) notFound();

  const sections = storeSections(builder);
  const hasCollections = sections.some(s => s.kind === 'collection');
  const { Story } = content;

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

      {sections.length > 0 && (
        <section className="store-block" aria-labelledby="store-sections-heading">
          <h2 id="store-sections-heading" className="headline-md">
            {hasCollections ? 'Collections' : 'Shop by piece'}
          </h2>
          <ul className="store-tiles">
            {sections.map(s => (
              <SectionTile key={s.slug} section={s} builder={builder} />
            ))}
          </ul>
        </section>
      )}

      <RoomSection
        id="store-rooms-heading"
        label={`${builder.name} pieces in a room`}
        items={storeProducts(builder).flatMap(p =>
          // One per piece, so the row shows the range rather than four of one crib.
          roomImagesFor(p.slug)
            .slice(0, 1)
            .map(room => ({ ...room, href: `/product/${p.slug}`, name: p.productName })),
        )}
      />

      <Story />
    </div>
  );
}
