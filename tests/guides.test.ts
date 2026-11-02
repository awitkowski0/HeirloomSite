/*
 * The /guides article template (src/app/guides, src/content/guides,
 * src/lib/guides.ts). Run with `npm test`.
 *
 * Every check runs over every guide in the registry AND over the TEST FIXTURE
 * in tests/fixtures/guide-fixture.ts, which is never in the registry and has
 * no route. The fixture is also rendered to real HTML in a child process
 * (tests/helpers/render-guide.mjs) so the template's actual output is checked,
 * not just its data.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sizeOf } from './helpers/image-size.mjs';
import fixture from './fixtures/guide-fixture';
import type { Guide } from '../src/content/guides/types';
import { GUIDES, getGuides, hasGuides } from '../src/content/guides';
import { guideJsonLd, guideMetadata, guidePageTitle, guideSitemapEntries } from '../src/lib/guides';
import { inlineHrefs, isInternalHref, plainText } from '../src/lib/guide-text';
import { BRAND_SITE_URL, SITE_NAME } from '../src/lib/seo';
import { getBrowsableProducts, getTaxonomyNodes } from '../src/lib/content';
import { getCollections } from '../src/lib/collections';
import sitemap from '../src/app/sitemap';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose JSON shape for assertions on generated output
type Loose = any;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_PUBLIC = join(root, 'tests/fixtures/public');
const SITE_PUBLIC = join(root, 'public');

/* ---------------------------------------------------------------- routes -- */

/** Every static page route under src/app (no dynamic segment). */
function staticAppRoutes(): Set<string> {
  const out = new Set<string>();
  const appDir = join(root, 'src/app');
  function walk(dir: string) {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (n === 'page.tsx') {
        const rel = relative(appDir, dir).split('/').filter(Boolean);
        if (rel.some(s => s.startsWith('['))) continue;
        const segs = rel.filter(s => !(s.startsWith('(') && s.endsWith(')')));
        out.add('/' + segs.join('/'));
      }
    }
  }
  walk(appDir);
  return out;
}

const BLOCKED_PREFIXES = ['/checkout', '/search', '/api', '/gone'];

function knownRoutes(guides: Guide[]): Set<string> {
  const routes = staticAppRoutes();
  for (const p of getBrowsableProducts()) routes.add(`/product/${p.slug}`);
  for (const n of getTaxonomyNodes()) routes.add(`/products/${n.slug}`);
  for (const c of getCollections()) routes.add(`/collections/${c.slug}`);
  for (const g of guides) routes.add(`/guides/${g.slug}`);
  return routes;
}

/* ------------------------------------------------------- wording guards -- */

// Guide copy is held to the site's standing wording rules (Brand). The #120
// and #121 guards will also cover src/content once they merge.
const BANNED: [RegExp, string][] = [
  [/\bexceeds?\b[^.\n]{0,60}\b(standard|cpsc|astm|regulation)/i, 'exceeds ... standards'],
  [/meets?\s+or\s+exceeds?|meets all (federal )?safety standards/i, 'meets/exceeds claim'],
  [/rigorously tested/i, 'rigorously tested'],
  [/non[- ]?toxic/i, 'non-toxic'],
  [/baby-safe/i, 'baby-safe'],
  [/greenguard|\bJPMA\b|\bCPSIA\b/i, 'certification name'],
  [/lead[- ]free|zero[- ]VOC|VOC[- ]free/i, 'material claim'],
  [/(cpsc|astm)[^.\n]{0,20}\b(compliant|certified|tested)\b/i, 'CPSC/ASTM compliant/certified/tested'],
  [/\b(compliant|certified|tested)\b[^.\n]{0,30}\b(cpsc|astm)\b/i, 'compliant/certified/tested to CPSC/ASTM'],
  [/\bcertified\b/i, 'certified'],
  [/\bWBE\b/, 'WBE'],
  [/wom[ae]n-owned/i, 'woman-owned (About page only)'],
  [/free shipping|delivery included|free delivery/i, 'free/included delivery'],
  // The OTO stain name "Michael's Cherry" (or "Michaels Cherry") is a finish, not a wood, so it is allowed;
  // "cherry wood" and any other bare "cherry" still fail.
  [/(?<!\bmichael['\u2019]?s\s+)\bcherry\b|\bcherry[- ]?wood\b|red oak/i, 'Cherry / Red Oak (Brown Maple only)'],
  [/Heirloom\s+Cribs\s+and\s+More/i, 'old company name'],
  [/vercel\.app/i, 'vercel.app host'],
  // Held origin lines (Pricing App #25 Q10): not in guides until ruled on.
  [/\bamish\b/i, 'held origin line: Amish'],
  [/made in (the )?(usa|u\.s\.a?\.?|united states|america|pennsylvania)/i, 'held origin line: made in'],
  [/american hardwood/i, 'held origin line: American hardwood'],
  [/handcrafted|hand-crafted/i, 'held origin line: handcrafted'],
];

/** Every copy string in a guide, with where it came from. */
function copyStrings(g: Guide): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [
    { where: 'title', text: g.title },
    { where: 'metaTitle', text: g.metaTitle },
    { where: 'metaDescription', text: g.metaDescription },
    ...g.answerFirst.map((text, i) => ({ where: `answerFirst[${i}]`, text })),
  ];
  g.sections.forEach((s, si) => {
    out.push({ where: `sections[${si}].h2`, text: s.h2 });
    s.paragraphs.forEach((text, i) => out.push({ where: `sections[${si}].paragraphs[${i}]`, text }));
    s.list?.items.forEach((text, i) => out.push({ where: `sections[${si}].list[${i}]`, text }));
    if (s.table) {
      out.push({ where: `sections[${si}].table.caption`, text: s.table.caption });
      [s.table.head, ...s.table.rows].flat().forEach((text, i) => out.push({ where: `sections[${si}].table[${i}]`, text }));
    }
  });
  g.faq.forEach((f, i) => {
    out.push({ where: `faq[${i}].q`, text: f.q });
    out.push({ where: `faq[${i}].a`, text: f.a });
  });
  g.related.forEach((r, i) => out.push({ where: `related[${i}].label`, text: r.label }));
  g.images.forEach((im, i) => {
    out.push({ where: `images[${i}].alt`, text: im.alt });
    if (im.caption) out.push({ where: `images[${i}].caption`, text: im.caption });
  });
  out.push({ where: 'ogImage.alt', text: g.ogImage.alt });
  g.sources.forEach((s, i) => out.push({ where: `sources[${i}].label`, text: s.label }));
  return out;
}

/** Every href a guide writes: inline links, related links and sources. */
function allHrefs(g: Guide): string[] {
  const inline = copyStrings(g).flatMap(c => inlineHrefs(c.text));
  return [...inline, ...g.related.map(r => r.href), ...g.sources.map(s => s.url)];
}

/* --------------------------------------------------------------- checker -- */

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const GENERIC_ALT = /^(image|photo|picture|img|graphic|placeholder)\b/i;

function sentences(text: string): string[] {
  return plainText(text)
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * All problems with one guide, as readable strings. Empty means it passes.
 * `publicDir` is where its image files live (public/ for real guides).
 */
function checkGuide(g: Guide, opts: { publicDir: string; routes: Set<string> }): string[] {
  const p: string[] = [];

  if (!SLUG.test(g.slug)) p.push(`slug "${g.slug}" is not lowercase kebab-case`);

  // Meta lengths.
  if (g.title.length === 0 || g.title.length > 110) p.push(`title is ${g.title.length} chars (1-110)`);
  const fullTitle = guidePageTitle(g);
  if (fullTitle.length > 60) p.push(`page title "${fullTitle}" is ${fullTitle.length} chars (max 60)`);
  if (g.metaTitle.includes(SITE_NAME) || /heirloom cribs/i.test(g.metaTitle)) p.push('metaTitle repeats the site name');
  const d = g.metaDescription.length;
  if (d < 70 || d > 155) p.push(`metaDescription is ${d} chars (70-155)`);

  // Dates.
  for (const k of ['datePublished', 'dateModified'] as const) {
    if (!ISO.test(g[k]) || Number.isNaN(Date.parse(g[k]))) p.push(`${k} "${g[k]}" is not ISO 8601 with an offset`);
  }
  if (Date.parse(g.dateModified) < Date.parse(g.datePublished)) p.push('dateModified is before datePublished');

  // Shape.
  const answerSentences = sentences(g.answerFirst.join(' '));
  if (answerSentences.length < 2 || answerSentences.length > 4)
    p.push(`answerFirst has ${answerSentences.length} sentences (2-4)`);
  if (g.sections.length === 0) p.push('no sections');
  g.sections.forEach((s, i) => {
    if (!s.h2.trim().endsWith('?')) p.push(`sections[${i}].h2 is not a question`);
    if (s.paragraphs.length === 0) p.push(`sections[${i}] has no paragraphs`);
  });

  // FAQ.
  if (g.faq.length < 3) p.push(`only ${g.faq.length} FAQ items (min 3)`);
  g.faq.forEach((f, i) => {
    if (!f.q.trim().endsWith('?')) p.push(`faq[${i}].q is not a question`);
    if (f.a.trim().length === 0) p.push(`faq[${i}].a is empty`);
    if (inlineHrefs(f.a).length > 0) p.push(`faq[${i}].a contains a link (FAQ answers are plain text)`);
  });

  // Links.
  for (const href of allHrefs(g)) {
    if (/vercel\.app/i.test(href)) p.push(`link to a vercel.app host: ${href}`);
    if (isInternalHref(href)) {
      const path = href.split('#')[0].split('?')[0];
      if (BLOCKED_PREFIXES.some(b => path === b || path.startsWith(`${b}/`))) p.push(`link to a blocked route: ${href}`);
      else if (!opts.routes.has(path)) p.push(`internal link does not resolve to a real route: ${href}`);
    } else if (!/^https:\/\//.test(href)) {
      p.push(`external link is not https: ${href}`);
    } else if (/^https:\/\/(www\.)?heirloomcribsandmore\.com/i.test(href)) {
      p.push(`own-site link written as absolute: ${href}`);
    }
  }
  g.related.forEach((r, i) => {
    if (!isInternalHref(r.href)) p.push(`related[${i}] is not an internal link`);
  });
  const shopLinks = allHrefs(g).filter(h => /^\/(product|products|collections)(\/|$)/.test(h));
  if (shopLinks.length < 2) p.push(`only ${shopLinks.length} links to product/category pages (min 2)`);

  // Images.
  const imgDir = `/images/guides/${g.slug}/`;
  const checkImage = (where: string, im: { src: string; alt: string; width: number; height: number }) => {
    const alt = im.alt.trim();
    const base = im.src.split('/').pop() ?? '';
    if (alt.length < 5) p.push(`${where} alt text missing or too short`);
    if (GENERIC_ALT.test(alt) || alt === base || alt === base.replace(/\.[a-z]+$/i, '')) p.push(`${where} alt text is not descriptive`);
    if (!im.src.startsWith(imgDir)) p.push(`${where} src is not under ${imgDir}`);
    const file = join(opts.publicDir, im.src);
    if (!existsSync(file)) {
      p.push(`${where} file missing: ${im.src}`);
      return null;
    }
    const native = sizeOf(file);
    if (im.width > native.width) p.push(`${where} declares width ${im.width} > native ${native.width} (upscaled)`);
    const ratio = im.width / im.height;
    const nativeRatio = native.width / native.height;
    if (Math.abs(ratio - nativeRatio) / nativeRatio > 0.02) p.push(`${where} declared aspect ratio differs from the file`);
    return native;
  };
  g.images.forEach((im, i) => {
    checkImage(`images[${i}]`, im);
    if (im.afterSection !== undefined && (im.afterSection < 0 || im.afterSection >= g.sections.length))
      p.push(`images[${i}].afterSection points at no section`);
  });
  const og = checkImage('ogImage', g.ogImage);
  if (og && (og.width !== 1200 || og.height !== 630)) p.push(`ogImage is ${og.width}x${og.height}, not 1200x630`);

  // Sources.
  g.sources.forEach((s, i) => {
    if (!s.label.trim()) p.push(`sources[${i}] has no label`);
  });

  // Wording.
  for (const { where, text } of copyStrings(g)) {
    for (const [re, label] of BANNED) if (re.test(text)) p.push(`${where} has banned wording: ${label}`);
  }

  // No sentence repeated anywhere in the guide.
  const seen = new Map<string, string>();
  for (const { where, text } of copyStrings(g)) {
    for (const s of sentences(text)) {
      if (s.length < 25) continue;
      const key = s.toLowerCase();
      if (seen.has(key)) p.push(`sentence repeated in ${seen.get(key)} and ${where}: "${s.slice(0, 50)}"`);
      else seen.set(key, where);
    }
  }

  // Structured data.
  const [article, faq, crumbs] = guideJsonLd(g) as Record<string, unknown>[];
  if (article['@type'] !== 'Article') p.push('first JSON-LD block is not Article');
  if (faq['@type'] !== 'FAQPage') p.push('second JSON-LD block is not FAQPage');
  if (crumbs['@type'] !== 'BreadcrumbList') p.push('third JSON-LD block is not BreadcrumbList');
  if (JSON.stringify(guideJsonLd(g)).includes('"Person"')) p.push('JSON-LD names a Person');

  return p;
}

const fixtureRoutes = () => knownRoutes([...getGuides()]);

/* ----------------------------------------------------------------- tests -- */

test('registry: the test fixture is not in it, and nothing in src imports from tests/', () => {
  assert.ok(!GUIDES.some(g => g.slug === fixture.slug), 'fixture slug is in the public registry');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap(n => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
    });
  for (const f of walk(join(root, 'src'))) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/from\s+['"][^'"]*tests\//.test(s), `${relative(root, f)} imports from tests/`);
    assert.ok(!s.includes(fixture.slug), `${relative(root, f)} mentions the fixture slug`);
  }
});

test('registry: every guide is its own file named after its slug, slugs unique', () => {
  const slugs = GUIDES.map(g => g.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'duplicate guide slug');
  for (const g of GUIDES) {
    assert.ok(existsSync(join(root, `src/content/guides/${g.slug}.ts`)), `no src/content/guides/${g.slug}.ts`);
  }
});

test('every registered guide passes every check (FAQ schema, metas, links, alt text, wording)', () => {
  const routes = knownRoutes([...GUIDES]);
  for (const g of GUIDES) {
    assert.deepEqual(checkGuide(g, { publicDir: SITE_PUBLIC, routes }), [], `guide ${g.slug} has problems`);
  }
});

test('fixture: passes every check, so the checks and the template agree', () => {
  assert.deepEqual(checkGuide(fixture, { publicDir: FIXTURE_PUBLIC, routes: fixtureRoutes() }), []);
});

test('checks catch broken guides (each mutation is reported)', () => {
  const routes = fixtureRoutes();
  const cases: [string, (g: Guide) => void, RegExp][] = [
    ['long page title', g => { g.metaTitle = 'x'.repeat(50); }, /page title .* chars \(max 60\)/],
    ['short description', g => { g.metaDescription = 'Too short.'; }, /metaDescription is \d+ chars/],
    ['too few FAQs', g => { g.faq = g.faq.slice(0, 2); }, /FAQ items \(min 3\)/],
    ['link in FAQ answer', g => { g.faq[0].a = 'See [cribs](/products/cribs).'; }, /contains a link/],
    ['broken internal link', g => { g.related[0].href = '/no-such-page'; }, /does not resolve/],
    ['vercel host', g => { g.sources[0].url = 'https://heirloom-site.vercel.app/x'; }, /vercel\.app/],
    ['blocked route', g => { g.related[0].href = '/checkout'; }, /blocked route/],
    ['missing alt', g => { g.images[0].alt = ''; }, /alt text missing/],
    ['file-name alt', g => { g.images[0].alt = 'figure.jpg'; }, /not descriptive/],
    ['missing image file', g => { g.images[0].src = `/images/guides/${g.slug}/nope.jpg`; }, /file missing/],
    ['upscaled image', g => { g.images[0].width = 1600; g.images[0].height = 1200; }, /upscaled/],
    ['wrong og size', g => { g.ogImage.src = `/images/guides/${g.slug}/figure.jpg`; }, /not 1200x630/],
    ['bad date', g => { g.dateModified = '2026-11-02'; }, /dateModified .* not ISO/],
    ['modified before published', g => { g.dateModified = '2026-11-01T09:00:00-05:00'; }, /before datePublished/],
    ['banned claim', g => { g.sections[0].paragraphs[0] = 'Our cribs are non-toxic.'; }, /non-toxic/],
    ['cherry wood', g => { g.sections[0].paragraphs[0] = 'This crib comes in cherry wood.'; }, /Cherry \/ Red Oak/],
    ['cherry wood after the stain name', g => { g.sections[0].paragraphs[0] = "Michael's Cherry wood is not sold."; }, /Cherry \/ Red Oak/],
    ['bare cherry', g => { g.sections[0].paragraphs[0] = 'A cherry finish.'; }, /Cherry \/ Red Oak/],
    ['held origin line', g => { g.answerFirst[0] = 'Every piece is handcrafted. A second sentence.'; }, /held origin line/],
    ['woman-owned line', g => { g.faq[0].a = 'We are a woman-owned shop.'; }, /woman-owned/],
    ['repeated sentence', g => { g.sections[1].paragraphs.push(g.sections[0].paragraphs[1]); }, /sentence repeated/],
    ['no shop links', g => {
      g.answerFirst = ['One placeholder sentence.', 'Two placeholder sentence.'];
      g.sections[0].paragraphs = ['Plain.'];
      g.sections[1].table!.rows = [['a', 'b']];
      g.related = [{ label: 'Contact', href: '/contact' }];
    }, /links to product\/category pages/],
  ];
  for (const [name, mutate, expected] of cases) {
    const g = structuredClone(fixture) as Guide;
    mutate(g);
    const problems = checkGuide(g, { publicDir: FIXTURE_PUBLIC, routes });
    assert.ok(problems.some(x => expected.test(x)), `${name}: expected ${expected}, got ${JSON.stringify(problems)}`);
  }
});

test('wording guard allows the OTO stain name "Michael\'s Cherry" / "Michaels Cherry"', () => {
  const routes = fixtureRoutes();
  for (const text of [
    'The Newport crib comes in the Michaels Cherry stain.',
    "The Newport crib comes in the Michael's Cherry stain.",
    'The Newport crib comes in the Michael\u2019s Cherry stain.',
    'The Newport crib comes in the MICHAELS CHERRY stain.',
  ]) {
    const g = structuredClone(fixture) as Guide;
    g.sections[0].paragraphs[0] = `${text} See [a product page](/product/newport-crib).`;
    assert.deepEqual(checkGuide(g, { publicDir: FIXTURE_PUBLIC, routes }), [], text);
  }
});

test('JSON-LD: Article + FAQPage + BreadcrumbList; organization author, never a person', () => {
  const [article, faq, crumbs] = guideJsonLd(fixture) as Record<string, Loose>[];
  assert.equal(article['@type'], 'Article');
  assert.equal(article.headline, fixture.title);
  assert.equal(article.datePublished, fixture.datePublished);
  assert.equal(article.dateModified, fixture.dateModified);
  assert.deepEqual(article.author, { '@type': 'Organization', name: SITE_NAME, url: article.author.url });
  assert.equal(article.publisher['@type'], 'Organization');
  assert.equal(article.publisher.name, SITE_NAME);
  assert.equal(faq['@type'], 'FAQPage');
  assert.equal(faq.mainEntity.length, fixture.faq.length);
  fixture.faq.forEach((f, i) => {
    assert.equal(faq.mainEntity[i].name, f.q);
    assert.equal(faq.mainEntity[i].acceptedAnswer.text, f.a);
  });
  assert.deepEqual(crumbs.itemListElement.map((c: Loose) => c.name), ['Home', 'Guides', fixture.title]);
});

test('metadata: relative canonical, full og block of type article, absolute title with the site name', () => {
  const m = guideMetadata(fixture) as Record<string, Loose>;
  assert.equal(m.alternates.canonical, `/guides/${fixture.slug}`);
  assert.deepEqual(m.title, { absolute: `${fixture.metaTitle} | ${SITE_NAME}` });
  assert.equal(m.description, fixture.metaDescription);
  const og = m.openGraph;
  assert.equal(og.type, 'article');
  assert.equal(og.url, `/guides/${fixture.slug}`);
  assert.equal(og.siteName, SITE_NAME);
  assert.equal(og.title, m.title.absolute);
  assert.equal(og.description, fixture.metaDescription);
  assert.equal(og.publishedTime, fixture.datePublished);
  assert.equal(og.modifiedTime, fixture.dateModified);
  assert.deepEqual(og.images, [{ url: fixture.ogImage.src, width: 1200, height: 630, alt: fixture.ogImage.alt }]);
  assert.equal(m.twitter.card, 'summary_large_image');
  // layout.tsx turns the relative canonical absolute with metadataBase = SITE_URL.
  assert.match(readFileSync(join(root, 'src/app/layout.tsx'), 'utf8'), /metadataBase:\s*new URL\(SITE_URL\)/);
});

test('sitemap: no guide entries while the registry is empty; each guide gets its dateModified', () => {
  assert.deepEqual(guideSitemapEntries([]), []);
  const urls = sitemap().map(e => e.url);
  if (!hasGuides()) {
    assert.ok(!urls.some(u => /\/guides(\/|$)/.test(u)), 'sitemap lists /guides while there are no guides');
  } else {
    for (const g of GUIDES) {
      const hits = sitemap().filter(e => e.url.endsWith(`/guides/${g.slug}`));
      assert.equal(hits.length, 1, `${g.slug} not in the sitemap exactly once`);
      assert.equal(hits[0].lastModified, g.dateModified);
    }
    assert.equal(urls.filter(u => u.endsWith('/guides')).length, 1);
  }
  const withFixture = guideSitemapEntries([fixture]);
  assert.deepEqual(withFixture.map(e => e.url.replace(/^https?:\/\/[^/]+/, '')), ['/guides', `/guides/${fixture.slug}`]);
  assert.ok(withFixture.every(e => e.lastModified === fixture.dateModified));
});

test('routes: static, no searchParams, unknown slugs 404, empty index 404s', () => {
  const page = readFileSync(join(root, 'src/app/guides/[slug]/page.tsx'), 'utf8');
  const index = readFileSync(join(root, 'src/app/guides/page.tsx'), 'utf8');
  assert.match(page, /export const dynamicParams = false;/);
  assert.match(page, /export function generateStaticParams/);
  assert.match(page, /notFound\(\)/);
  assert.match(index, /if \(guides\.length === 0\) notFound\(\);/);
  for (const s of [page, index]) assert.ok(!/searchParams/.test(s), 'a guides route reads searchParams');
});

test('footer: "All guides" only when at least one guide exists', () => {
  const footer = readFileSync(join(root, 'src/components/layout/Footer.tsx'), 'utf8');
  assert.match(footer, /\{hasGuides\(\) \? \(\s*<li>\s*<Link href="\/guides">All guides<\/Link>/);
});

/* --------------------------------------------- rendered output (child) -- */

type Rendered = {
  siteUrl: string;
  siteName: string;
  articleHtml: string;
  indexHtml: string;
  footerHtml: string;
  metadata: Record<string, Loose>;
  jsonLd: Record<string, Loose>[];
  sitemapWithFixture: { url: string; lastModified: string }[];
  sitemapEmpty: unknown[];
  registrySlugs: string[];
};

/**
 * Renders the fixture in a separate process that looks like a Vercel preview
 * whose NEXT_PUBLIC_SITE_URL wrongly points at a vercel.app host. SITE_URL is
 * read at import time, so this has to be its own process.
 */
let rendered: Rendered | null = null;
function renderFixture(): Rendered {
  if (rendered) return rendered;
  const out = execFileSync(
    process.execPath,
    ['--import', './tests/register.mjs', '--import', './tests/helpers/tsx-hook.mjs', 'tests/helpers/render-guide.mjs'],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        NEXT_PUBLIC_SITE_URL: 'https://heirloom-site-git-feat-x-funalexs-projects.vercel.app',
      },
    }
  );
  rendered = JSON.parse(out) as Rendered;
  return rendered;
}

const decode = (s: string) =>
  s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('rendered fixture: canonical host is the apex, never vercel.app', () => {
  const r = renderFixture();
  assert.equal(r.siteUrl, BRAND_SITE_URL);
  assert.equal(BRAND_SITE_URL, 'https://heirloomcribsandmore.com');
  const everything = JSON.stringify(r);
  assert.ok(!/vercel\.app/i.test(everything.replace(/"siteUrl":"[^"]*"/, '')), 'vercel.app leaked into output');
  const absUrls = [...r.articleHtml.matchAll(/https?:\/\/[^"<\s]+/g)].map(m => m[0]).filter(u => !u.startsWith('https://schema.org'));
  for (const u of absUrls.filter(u => !u.startsWith('https://example.com'))) {
    assert.ok(u === BRAND_SITE_URL || u.startsWith(`${BRAND_SITE_URL}/`), `absolute URL not on the apex: ${u}`);
  }
  for (const e of r.sitemapWithFixture) assert.ok(e.url.startsWith(`${BRAND_SITE_URL}/guides`), e.url);
  assert.equal(r.jsonLd[0].mainEntityOfPage['@id'], `${BRAND_SITE_URL}/guides/${fixture.slug}`);
});

test('rendered fixture: page shows every part, JSON-LD in the page matches the visible FAQ', () => {
  const r = renderFixture();
  const html = r.articleHtml;
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, 'exactly one H1');
  assert.ok(decode(html).includes(`>${fixture.title}</h1>`));
  assert.ok(decode(html).includes(`By ${r.siteName} · Updated <time dateTime="${fixture.dateModified}">November 3, 2026</time>`));
  for (const s of fixture.sections) assert.ok(decode(html).includes(`>${s.h2}</h2>`), `missing H2 ${s.h2}`);
  assert.ok(html.includes('<ol class="doc-list"><li>Fixture step one.</li>'), 'ordered list not rendered');
  assert.ok(html.includes('<table class="doc-table"><caption>Fixture table caption</caption>'), 'table not rendered');
  // Inline links render as real anchors to the same hrefs.
  for (const href of fixture.answerFirst.flatMap(inlineHrefs)) assert.ok(html.includes(`href="${href}"`), href);
  for (const r2 of fixture.related) assert.ok(html.includes(`href="${r2.href}"`), r2.href);
  assert.ok(html.includes('rel="noopener noreferrer"'), 'external source link has no rel');
  // Every <img> has non-empty alt.
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
  assert.equal(imgs.length, fixture.images.length);
  for (const tag of imgs) assert.match(tag, /alt="[^"]{5,}"/, `img without alt: ${tag}`);
  // The three JSON-LD blocks, and FAQ answers identical to the visible text.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  assert.deepEqual(blocks.map(b => b['@type']), ['Article', 'FAQPage', 'BreadcrumbList']);
  for (const q of blocks[1].mainEntity) {
    assert.ok(decode(html).includes(`<h3>${q.name}</h3><p>${q.acceptedAnswer.text}</p>`), `FAQ markup does not match page: ${q.name}`);
  }
  assert.ok(html.includes('class="button-primary" href="/contact"'), 'no primary contact button');
});

test('rendered index and footer: index lists the fixture; footer has no /guides link while empty', () => {
  const r = renderFixture();
  assert.ok(r.indexHtml.includes(`href="/guides/${fixture.slug}"`));
  assert.ok(r.indexHtml.includes('<h1 class="headline-xl">Guides</h1>'));
  assert.deepEqual(r.registrySlugs, GUIDES.map(g => g.slug));
  if (r.registrySlugs.length === 0) {
    assert.ok(!r.footerHtml.includes('href="/guides"'), 'footer links /guides while there are no guides');
    assert.ok(!r.footerHtml.includes('All guides'));
  } else {
    assert.ok(r.footerHtml.includes('href="/guides"'));
  }
  assert.ok(r.footerHtml.includes('href="/timeline"'), 'footer Guides column did not render');
});
