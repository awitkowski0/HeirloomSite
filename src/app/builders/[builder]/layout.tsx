import { notFound } from 'next/navigation';
import StoreBanner, { StoreBannerBar } from '@/components/builders/StoreBanner';
import StoreBannerSwitch from '@/components/builders/StoreBannerSwitch';
import StoreMenu from '@/components/builders/StoreMenu';
import { BUILDERS } from '@/lib/builders';
import { storeProducts, storeSections } from '@/lib/builder-stores';

/*
 * Every builder's store, generated from its record in data/builders/. The
 * banner, the sticky menu and the store's own search live here so a section
 * opens inside the store with all three kept. A builder with no pieces in the
 * catalog gets the banner alone: a menu or a search with nothing in it is noise.
 */
export const dynamicParams = false;

type Params = { builder: string };

export function generateStaticParams(): Params[] {
  return BUILDERS.map(b => ({ builder: b.id }));
}

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<Params> }) {
  const { builder: id } = await params;
  const builder = BUILDERS.find(b => b.id === id);
  if (!builder) notFound();

  const sections = storeSections(builder);
  const slugs = storeProducts(builder).map(p => p.slug);

  return (
    <div className="store">
      <StoreBannerSwitch full={<StoreBanner builder={builder} />} collapsed={<StoreBannerBar builder={builder} />} />
      {sections.length > 0 && (
        <StoreMenu
          builderName={builder.name}
          home={builder.href}
          sections={sections.map(s => ({ slug: s.slug, name: s.name }))}
          slugs={slugs}
        />
      )}
      {children}
    </div>
  );
}
