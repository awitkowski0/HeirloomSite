import type { Metadata, MetadataRoute } from 'next';
import type { Guide } from '@/content/guides/types';
import { GUIDES_INDEX } from '@/content/guides';
import {
  SITE_NAME,
  SITE_URL,
  articleJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
} from './seo';
import { plainText } from './guide-text';

/*
 * Everything a guide page needs besides its markup: paths, metadata, JSON-LD
 * and sitemap entries. Pure functions of the Guide object, so
 * tests/guides.test.ts can check them without a build.
 */

export const GUIDES_PATH = '/guides';

export function guidePath(slug: string): string {
  return `${GUIDES_PATH}/${slug}`;
}

/** The full <title>: the article's metaTitle plus the site name constant. */
export function guidePageTitle(guide: Pick<Guide, 'metaTitle'>): string {
  return `${guide.metaTitle} | ${SITE_NAME}`;
}

/**
 * Page metadata. The og and twitter blocks are written out in full: a page's
 * openGraph object replaces the layout's rather than merging into it.
 * Canonical and og:url are relative; layout.tsx's metadataBase (SITE_URL, never
 * a *.vercel.app host) makes them absolute.
 */
export function guideMetadata(guide: Guide): Metadata {
  const title = guidePageTitle(guide);
  const path = guidePath(guide.slug);
  return {
    title: { absolute: title },
    description: guide.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      locale: 'en_US',
      url: path,
      title,
      description: guide.metaDescription,
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
      images: [
        {
          url: guide.ogImage.src,
          width: guide.ogImage.width,
          height: guide.ogImage.height,
          alt: guide.ogImage.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: guide.metaDescription,
      images: [guide.ogImage.src],
    },
  };
}

export function guideBreadcrumb(guide: Guide): { name: string; path: string }[] {
  return [
    { name: 'Home', path: '/' },
    { name: GUIDES_INDEX.heading, path: GUIDES_PATH },
    { name: guide.title, path: guidePath(guide.slug) },
  ];
}

/** The three JSON-LD blocks a guide page carries: Article, FAQPage, BreadcrumbList. */
export function guideJsonLd(guide: Guide): Record<string, unknown>[] {
  return [
    articleJsonLd({
      headline: guide.title,
      description: guide.metaDescription,
      path: guidePath(guide.slug),
      images: [guide.ogImage.src, ...guide.images.map(i => i.src)],
      datePublished: guide.datePublished,
      dateModified: guide.dateModified,
    }),
    faqPageJsonLd(guide.faq.map(f => ({ question: f.q, answerText: plainText(f.a) }))),
    breadcrumbJsonLd(guideBreadcrumb(guide)),
  ];
}

/** Metadata for the /guides index (only rendered once a guide exists). */
export function guidesIndexMetadata(guides: Guide[]): Metadata {
  const title = `${GUIDES_INDEX.metaTitle} | ${SITE_NAME}`;
  const image = guides[0]?.ogImage;
  return {
    title: { absolute: title },
    description: GUIDES_INDEX.metaDescription,
    alternates: { canonical: GUIDES_PATH },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
      url: GUIDES_PATH,
      title,
      description: GUIDES_INDEX.metaDescription,
      images: image ? [{ url: image.src, width: image.width, height: image.height, alt: image.alt }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: GUIDES_INDEX.metaDescription,
      images: image ? [image.src] : undefined,
    },
  };
}

/**
 * Sitemap entries: nothing at all while there are no guides, otherwise the
 * index plus one entry per guide. lastModified is the article's own
 * dateModified - a real per-page date, never the build time (see the comment
 * in src/app/sitemap.ts).
 */
export function guideSitemapEntries(guides: Guide[]): MetadataRoute.Sitemap {
  if (guides.length === 0) return [];
  const newest = guides.reduce((a, g) => (Date.parse(g.dateModified) > Date.parse(a) ? g.dateModified : a), guides[0].dateModified);
  return [
    { url: `${SITE_URL}${GUIDES_PATH}`, lastModified: newest, changeFrequency: 'weekly', priority: 0.5 },
    ...guides.map(g => ({
      url: `${SITE_URL}${guidePath(g.slug)}`,
      lastModified: g.dateModified,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    })),
  ];
}

/** "November 9, 2026", in the shop's time zone. */
export function formatGuideDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}
