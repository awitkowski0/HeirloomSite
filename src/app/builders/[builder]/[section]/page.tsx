import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListingAnalytics from '@/components/products/ListingAnalytics';
import ShopBrowser from '@/components/shop/ShopBrowser';
import { BUILDERS } from '@/lib/builders';
import { storeSection, storeSections } from '@/lib/builder-stores';
import { formatPriceApprox } from '@/lib/format';
import { breadcrumbJsonLd, itemListJsonLd, jsonLdScript } from '@/lib/seo';
import { toShopItems } from '@/lib/shop';

export const dynamicParams = false;

type Params = { builder: string; section: string };

export function generateStaticParams(): Params[] {
  return BUILDERS.flatMap(b => storeSections(b).map(s => ({ builder: b.id, section: s.slug })));
}

function resolve(params: Params) {
  const builder = BUILDERS.find(b => b.id === params.builder);
  const section = builder ? storeSection(builder, params.section) : null;
  return builder && section ? { builder, section } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = resolve(await params);
  if (!resolved) return {};
  const { builder, section } = resolved;
  const path = `${builder.href}/${section.slug}`;
  const title = `${section.name} from ${builder.name} | Heirloom Cribs & More`;
  const description = `${section.name}, from ${builder.name}: ${section.count} ${section.count === 1 ? 'piece' : 'pieces'} from ${formatPriceApprox(section.fromPrice)}, made to order.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
    twitter: { title },
  };
}

export default async function StoreSectionPage({ params }: { params: Promise<Params> }) {
  const resolved = resolve(await params);
  if (!resolved) notFound();
  const { builder, section } = resolved;
  const path = `${builder.href}/${section.slug}`;

  return (
    <div className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListJsonLd(section.products, path)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Our builders', path: '/builders' },
              { name: builder.name, path: builder.href },
              { name: section.name, path },
            ]),
          ),
        }}
      />
      <header className="page-intro">
        <h1>{section.name}</h1>
        <p className="small">
          {section.count} {section.count === 1 ? 'piece' : 'pieces'} · From {formatPriceApprox(section.fromPrice)}
        </p>
      </header>
      <section aria-label={`${section.name} from ${builder.name}`}>
        <ShopBrowser items={toShopItems(section.products)} priorityCount={4} hideBuilder />
        <ListingAnalytics />
      </section>
    </div>
  );
}
