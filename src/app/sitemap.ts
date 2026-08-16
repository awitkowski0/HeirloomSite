import type { MetadataRoute } from 'next';
import { getBrowsableProducts, getTaxonomyNodes, getInventory } from '@/lib/content';
import { variantPathsFor } from '@/lib/variants';
import { getCollections } from '@/lib/collections';
import { SITE_URL } from '@/lib/seo';

/**
 * Every indexable URL. Deliberately excludes /checkout and /search, which are
 * noindex, and the unlisted conversion kits, which are not browsable - see
 * src/lib/taxonomy.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/collections`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/safety`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/care`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  /*
   * Every live taxonomy node, parents and sub-menus alike. Nodes the shop has
   * not stocked are pruned before they get here, so an unstocked category is
   * never submitted as a thin or empty page.
   */
  const categoryRoutes: MetadataRoute.Sitemap = getTaxonomyNodes().map(n => ({
    url: `${SITE_URL}/products/${n.slug}`,
    lastModified: now,
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
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: variant.length === 0 ? 0.8 : variant.length === 1 ? 0.6 : 0.5,
    }));
  });

  const collectionRoutes: MetadataRoute.Sitemap = getCollections().map(c => ({
    url: `${SITE_URL}/collections/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...collectionRoutes, ...productRoutes];
}
