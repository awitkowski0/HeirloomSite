import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BUILDER_CONTENT } from '@/components/builders/content';
import { BUILDERS } from '@/lib/builders';
import { storeProducts, storeSections } from '@/lib/builder-stores';
import { formatPriceApprox } from '@/lib/format';
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shop by builder',
  description:
    'The independent builders whose cribs and nursery furniture Heirloom Cribs & More sells, each with its own store.',
  alternates: { canonical: '/builders' },
  openGraph: { url: '/builders' },
};

/*
 * One row per builder. The line under each name is that builder page's own
 * meta description (src/components/builders/content/<id>.tsx), so this page
 * adds no new claims about anyone; the rest is counted from the catalogue.
 */
export default function BuildersPage() {
  return (
    <div className="container builders-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Our builders', path: '/builders' },
            ]),
          ),
        }}
      />
      <header className="page-header">
        <h1 className="headline-lg text-primary">Shop by builder</h1>
        <p className="body-lg text-on-surface-variant">Each builder has a store here, with its collections and its story.</p>
      </header>

      <ul className="builder-rows">
        {BUILDERS.map(builder => {
          const products = storeProducts(builder);
          const cover = storeSections(builder)[0]?.image ?? null;
          const summary = BUILDER_CONTENT[builder.id]?.metadata.description;
          const facts = [
            products.length > 0
              ? `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`
              : 'Available on request',
            products.length > 0 ? `From ${formatPriceApprox(Math.min(...products.map(p => p.minPrice)))}` : null,
            builder.leadTime,
          ].filter(Boolean);
          return (
            <li key={builder.id} className={cover ? 'builder-row' : 'builder-row builder-row--plain'}>
              {cover ? (
                <Link href={builder.href} className="builder-row__photo" tabIndex={-1} aria-hidden="true">
                  <Image src={cover} alt="" fill sizes="(max-width: 767px) 92vw, 320px" />
                </Link>
              ) : null}
              <div className="builder-row__text">
                <h2>
                  <Link href={builder.href} className="piece-builder builder-row__name">
                    {builder.name}
                  </Link>
                </h2>
                {summary ? <p className="body-md">{summary}</p> : null}
                <p className="builder-row__facts">{facts.join(' · ')}</p>
                <p>
                  <Link href={builder.href} className="filter-link">
                    Visit the store
                  </Link>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
