/*
 * Test-only child process for tests/guides.test.ts. Renders the article
 * template, the index and the site footer to static HTML with the TEST
 * FIXTURE guide (tests/fixtures/guide-fixture.ts, never in the registry), and
 * prints everything the parent test asserts on as one JSON object.
 *
 * Run as: node --import ./tests/register.mjs --import ./tests/helpers/tsx-hook.mjs tests/helpers/render-guide.mjs
 * (no react-server condition: react-dom/server needs the client build).
 */
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { default: fixture } = await import('../fixtures/guide-fixture.ts');
const { default: GuideArticle } = await import('../../src/components/guides/GuideArticle.tsx');
const { default: GuideIndex } = await import('../../src/components/guides/GuideIndex.tsx');
const { default: Footer } = await import('../../src/components/layout/Footer.tsx');
const guides = await import('../../src/lib/guides.ts');
const seo = await import('../../src/lib/seo.ts');
const registry = await import('../../src/content/guides/index.ts');

const out = {
  siteUrl: seo.SITE_URL,
  siteName: seo.SITE_NAME,
  articleHtml: renderToStaticMarkup(h(GuideArticle, { guide: fixture })),
  indexHtml: renderToStaticMarkup(h(GuideIndex, { guides: [fixture] })),
  footerHtml: renderToStaticMarkup(h(Footer)),
  metadata: guides.guideMetadata(fixture),
  indexMetadata: guides.guidesIndexMetadata([fixture]),
  jsonLd: guides.guideJsonLd(fixture),
  sitemapWithFixture: guides.guideSitemapEntries([fixture]),
  sitemapEmpty: guides.guideSitemapEntries([]),
  registrySlugs: registry.GUIDES.map(g => g.slug),
};
process.stdout.write(JSON.stringify(out));
