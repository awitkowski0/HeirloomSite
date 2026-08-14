import type { MetadataRoute } from 'next';
import { getProductIndex, getCategories, getInventory } from '@/lib/content';
import { variantPathsFor } from '@/lib/variants';
import { SITE_URL } from '@/lib/seo';

/**
 * Every indexable URL. Deliberately excludes /checkout,
 * /order-confirmation/* and /search, which are all noindex.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/safety`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/care`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = getCategories().map(c => ({
    url: `${SITE_URL}/products/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  /*
   * Products plus every wood and finish that has its own URL.
   *
   * A finish page is a distinct offer - its own image and its own price - so
   * it is submitted rather than left for a crawler to find. Priority steps
   * down with depth so the product page stays the one that ranks.
   */
  const inventory = getInventory();
  const productRoutes: MetadataRoute.Sitemap = getProductIndex().flatMap(p => {
    const configurations = inventory.filter(i => i.slug === p.slug);
    return variantPathsFor(configurations).map(variant => ({
      url: `${SITE_URL}/product/${[p.slug, ...variant].join('/')}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: variant.length === 0 ? 0.8 : variant.length === 1 ? 0.6 : 0.5,
    }));
  });

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
