import Link from 'next/link';
import { notFound } from 'next/navigation';
import StoreBannerSwitch from '@/components/builders/StoreBannerSwitch';
import StoreMenu from '@/components/builders/StoreMenu';
import { BUILDER_CONTENT } from '@/components/builders/content';
import { BUILDERS, builderById } from '@/lib/builders';
import { storeProducts, storeSections } from '@/lib/builder-stores';

/*
 * Every builder's store: /builders/<id> and /builders/<id>/<section>.
 *
 * These replaced three hand-written pages at the same URLs, which are live and
 * indexed, so the ids in src/lib/builders.ts are fixed. The store home shows
 * the builder's banner (the old page's header, verbatim); a section shows the
 * builder's name as a link home instead. The menu and the store search sit on
 * both. A builder with nothing listed (Kids Comfort, available on request)
 * gets the banner alone: a menu or a search with nothing in it is noise.
 */
export const dynamicParams = false;

type Params = { builder: string };

export function generateStaticParams(): Params[] {
  return BUILDERS.map(b => ({ builder: b.id }));
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { builder: id } = await params;
  const builder = builderById(id);
  const content = BUILDER_CONTENT[id];
  if (!builder || !content) notFound();

  const sections = storeSections(builder);
  const slugs = storeProducts(builder).map(p => p.slug);
  const { Banner } = content;

  return (
    <div className="container store">
      <StoreBannerSwitch
        full={<Banner />}
        collapsed={
          <p className="store-bar">
            <Link href={builder.href} className="piece-builder">
              {builder.name}
            </Link>
          </p>
        }
      />
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
