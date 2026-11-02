import type { Guide } from './types';

/**
 * The guides registry: every published article, one import per line.
 *
 * Empty on purpose until the first Brand-approved article lands. While it is
 * empty, /guides and /guides/<anything> answer 404, nothing is added to the
 * sitemap and the footer shows no "All guides" link.
 *
 * To add an article:
 *   1. add src/content/guides/<slug>.ts default-exporting a Guide,
 *   2. import it here and add it to GUIDES,
 *   3. put its images in public/images/guides/<slug>/.
 * tests/guides.test.ts checks every entry.
 */
export const GUIDES: readonly Guide[] = [];

/**
 * Wording for the /guides index page. The index only renders once at least
 * one article exists; Brand reviews this wording with article #1.
 */
export const GUIDES_INDEX = {
  heading: 'Guides',
  metaTitle: 'Guides',
  metaDescription:
    'Plain answers for parents choosing, using, and caring for solid hardwood nursery furniture: cribs, conversion, finishes, and more.',
  lede: 'Plain answers for parents choosing, using, and caring for nursery furniture.',
} as const;

/** Every guide, most recently updated first. */
export function getGuides(): Guide[] {
  return [...GUIDES].sort((a, b) => Date.parse(b.dateModified) - Date.parse(a.dateModified));
}

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find(g => g.slug === slug);
}

export function hasGuides(): boolean {
  return GUIDES.length > 0;
}
