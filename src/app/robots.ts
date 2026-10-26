import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/*
 * The product checkout deep links (/checkout/{id}:{qty}) are the landing pages
 * for the Merchant Center checkout URL template, so Google's crawlers must be
 * able to FETCH them even though the pages are noindex,nofollow. The blanket
 * `Disallow: /checkout` still hides them from everyone else, and the bare
 * /checkout cart page stays blocked for every agent (a longer `Allow: /checkout/`
 * wins over the shorter `Disallow: /checkout` only for the /checkout/... paths,
 * per Google's longest-match rule). /search and /api stay disallowed throughout.
 */
export default function robots(): MetadataRoute.Robots {
  const shared = { disallow: ['/checkout', '/search', '/api/'] };
  return {
    rules: [
      // Google's product/checkout crawlers may fetch the deep-link pages.
      { userAgent: 'Googlebot', allow: ['/', '/checkout/'], ...shared },
      { userAgent: 'Storebot-Google', allow: ['/', '/checkout/'], ...shared },
      // Everyone else: unchanged from before.
      { userAgent: '*', allow: '/', ...shared },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
