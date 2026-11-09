import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListingAnalytics from '@/components/products/ListingAnalytics';
import ShopBrowser from '@/components/shop/ShopBrowser';
import { getBrowsableProducts } from '@/lib/content';
import { toShopItems } from '@/lib/shop';
import { USE_TAGS } from '@/lib/uses';

export const dynamicParams = false;

export function generateStaticParams() {
  return USE_TAGS.map(u => ({ use: u.slug }));
}

const find = (slug: string) => USE_TAGS.find(u => u.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ use: string }> }): Promise<Metadata> {
  const { use } = await params;
  const entry = find(use);
  if (!entry) return { title: 'Not found', robots: { index: false } };
  const title = `Pieces That Can Be a ${entry.tag[0]}${entry.tag.slice(1).toLowerCase()}`;
  return { title, alternates: { canonical: `/uses/${use}` }, openGraph: { title, url: `/uses/${use}` } };
}

export default async function UsePage({ params }: { params: Promise<{ use: string }> }) {
  const { use } = await params;
  const entry = find(use);
  if (!entry) notFound();
  const items = toShopItems(getBrowsableProducts()).filter(i => i.uses.includes(entry.tag));

  return (
    <div className="container products-page">
      <header className="page-header">
        <p className="label-caps text-on-surface-variant">What it can be</p>
        <h1 className="headline-lg text-primary">{entry.tag}</h1>
        <p className="body-lg text-on-surface-variant">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</p>
      </header>
      <section aria-label={`${entry.tag} pieces`}>
        <ShopBrowser items={items} priorityCount={3} />
        <ListingAnalytics />
      </section>
    </div>
  );
}
