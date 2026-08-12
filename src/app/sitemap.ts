import type { MetadataRoute } from 'next';
import { getProductIndex, getCategories } from '@/lib/content';
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
    { url: `${SITE_URL}/gallery`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
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

  const productRoutes: MetadataRoute.Sitemap = getProductIndex().map(p => ({
    url: `${SITE_URL}/product/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
