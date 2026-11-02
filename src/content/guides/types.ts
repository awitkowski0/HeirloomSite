/**
 * One guide article, as data.
 *
 * Every article is one file in this folder (`<slug>.ts`) that default-exports
 * a `Guide`, plus one line in ./index.ts. The page, the metadata, the JSON-LD
 * and the sitemap entry are all generated from this object, so the copy a
 * visitor reads and the copy search engines are given cannot drift apart.
 *
 * Copy strings are plain text. The only markup allowed is an inline link
 * written `[label](/path)` inside `answerFirst`, `paragraphs`, list items and
 * table cells (see src/lib/guide-text.ts). FAQ answers take no links at all:
 * they are rendered and sent as FAQPage answers as the same string.
 *
 * There is deliberately no author field. Articles are published by the
 * business (SITE_NAME in src/lib/seo.ts), never by a named person.
 */
export interface GuideImage {
  /** Absolute path under /images/guides/<slug>/ in public/. */
  src: string;
  /** Describes what is in the picture. Required, never the file name. */
  alt: string;
  /** Declared size, no larger than the file's real pixel size. */
  width: number;
  height: number;
  caption?: string;
  /**
   * Index of the section this image follows. Leave out to show it straight
   * after the answer-first block.
   */
  afterSection?: number;
}

export interface GuideSection {
  /** A natural question, ending in "?". */
  h2: string;
  /** The first paragraph must stand on its own as an answer. */
  paragraphs: string[];
  list?: { ordered: boolean; items: string[] };
  table?: { caption: string; head: string[]; rows: string[][] };
}

export interface Guide {
  /** Lowercase kebab-case. Must equal the file name. Never changes once live. */
  slug: string;
  /** The H1 and the Article headline. At most 110 characters. */
  title: string;
  /**
   * The <title> WITHOUT the site name. The page appends " | SITE_NAME"; the
   * whole string must be at most 60 characters.
   */
  metaTitle: string;
  /** 70 to 155 characters. */
  metaDescription: string;
  /** ISO 8601 with an offset, e.g. 2026-11-09T09:00:00-05:00. */
  datePublished: string;
  /** ISO 8601 with an offset, on or after datePublished. */
  dateModified: string;
  /** Two to four sentences that answer the question directly. */
  answerFirst: string[];
  sections: GuideSection[];
  /** At least three. Plain text answers, no links. */
  faq: { q: string; a: string }[];
  /** Internal links only; each must be a real route on the site. */
  related: { label: string; href: string }[];
  images: GuideImage[];
  /** Social preview image: exactly 1200 x 630 pixels. */
  ogImage: { src: string; alt: string; width: 1200; height: 630 };
  /** Real sources the copy relies on. https only. */
  sources: { label: string; url: string }[];
}
