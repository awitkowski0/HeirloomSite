import type { MetadataRoute } from 'next';
import { getBrowsableProducts, getTaxonomyNodes, getInventory } from '@/lib/content';
import { variantPathsFor } from '@/lib/variants';
import { getCollections } from '@/lib/collections';
import { SITE_URL } from '@/lib/seo';

/**
 * Every indexable URL. Deliberately excludes /checkout and /search, which are
 * noindex, and the unlisted conversion kits, which are not browsable - see
 * src/lib/taxonomy.ts.
 *
 * No `lastModified` anywhere, deliberately. Nothing in this repo records when a
 * page's content actually changed: the entries used `new Date()`, so every
 * deploy restamped every URL as modified that instant. Google discounts a
 * lastmod it can see is unreliable, for the whole site - which is worse than
 * omitting it, since the field is optional in the sitemap protocol. To get the
 * signal back, stamp a real per-item date in scripts/build-data.mjs (source
 * file mtime) and read it here; do not reintroduce a build timestamp.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/collections`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/safety`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/care`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/how-conversion-works`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/why-hardwood`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/finishes`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/timeline`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/safe-sleep`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  /*
   * Every live taxonomy node, parents and sub-menus alike. Nodes the shop has
   * not stocked are pruned before they get here, so an unstocked category is
   * never submitted as a thin or empty page.
   */
  const categoryRoutes: MetadataRoute.Sitemap = getTaxonomyNodes().map(n => ({
    url: `${SITE_URL}/products/${n.slug}`,
    // A sub-menu sits one step below its parent, as it does in the nav.
    priority: n.children ? 0.7 : 0.6,
    changeFrequency: 'weekly',
  }));

  /*
   * Products plus every wood and finish that has its own URL.
   *
   * A finish page is a distinct offer - its own image and its own price - so
   * it is submitted rather than left for a crawler to find. Priority steps
   * down with depth so the product page stays the one that ranks.
   */
  const inventory = getInventory();
  const productRoutes: MetadataRoute.Sitemap = getBrowsableProducts().flatMap(p => {
    const configurations = inventory.filter(i => i.slug === p.slug);
    return variantPathsFor(configurations).map(variant => ({
      url: `${SITE_URL}/product/${[p.slug, ...variant].join('/')}`,
      changeFrequency: 'monthly' as const,
      priority: variant.length === 0 ? 0.8 : variant.length === 1 ? 0.6 : 0.5,
    }));
  });

  const collectionRoutes: MetadataRoute.Sitemap = getCollections().map(c => ({
    url: `${SITE_URL}/collections/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...collectionRoutes, ...productRoutes];
}
