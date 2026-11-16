import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BUILDERS, getBuilder } from '../src/lib/builders';
import { storeProducts, storeSection, storeSections } from '../src/lib/builder-stores';
import { getProductIndex } from '../src/lib/content';
import sitemap from '../src/app/sitemap';
import { loadCatalog, validateCatalog } from '../scripts/lib/catalog-rules.mjs';

/*
 * The store routes. Rendering needs the Next build; what is asserted here is
 * what decides a store's pages and its promises: which paths exist, what they
 * list, the price they quote, and that nothing opts a store out of prerendering.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const SECTION_ROUTE = 'src/app/builders/[builder]/[section]/page.tsx';
const ROUTES = ['src/app/builders/[builder]/layout.tsx', 'src/app/builders/[builder]/page.tsx', SECTION_ROUTE];
const CLIENT = ['src/components/builders/StoreBannerSwitch.tsx', 'src/components/builders/StoreMenu.tsx', 'src/components/builders/StoreSearch.tsx'];

test('every builder gets a store from its record and no hand-written page remains', () => {
  assert.ok(BUILDERS.length >= 3);
  for (const b of BUILDERS) assert.equal(b.href, `/builders/${b.id}`);
  const folders = readdirSync(join(root, 'src/app/builders'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  assert.deepEqual(folders, ['[builder]'], 'a folder here shadows a generated store');
});

test('store routes stay prerendered: no query-string reads, params known at build time', () => {
  for (const f of [...ROUTES, ...CLIENT]) {
    const s = read(f);
    assert.ok(!/searchParams|useSearchParams/.test(s), `${f} reads the query string`);
    assert.ok(!/export const dynamic\s*=\s*['"]force-dynamic|cookies\(\)|headers\(\)/.test(s), `${f} opts out of static rendering`);
  }
  assert.match(read(ROUTES[0]), /export function generateStaticParams/);
  assert.match(read(SECTION_ROUTE), /export function generateStaticParams/);
  assert.match(read(SECTION_ROUTE), /dynamicParams = false/);
});

test('the layout keeps the banner, the menu and the scoped search; the section collapses the banner', () => {
  const layout = read(ROUTES[0]);
  assert.ok(layout.includes('<StoreBannerSwitch') && layout.includes('<StoreMenu'), 'layout must hold the banner switch and the menu');
  assert.match(read(CLIENT[1]), /<StoreSearch /);
  assert.match(read(CLIENT[0]), /useSelectedLayoutSegment\(\) === null \? full : collapsed/);
  assert.ok(read(CLIENT[2]).includes('useSearch(query, only)'), 'the store search must be limited to the builder');
  assert.ok(read(SECTION_ROUTE).includes('ShopBrowser'), 'sections use the normal listing controls');
  assert.ok(read('src/lib/search.ts').includes('only.has('), 'search scope filter missing');
});

test('Old Town Oak sections are its five collections, Fisher\'s are its piece types', () => {
  assert.deepEqual(storeSections(getBuilder('old-town-oak')).map(s => s.name), ['Addison', 'French Country', 'Mackenzie', 'Newport', 'West Lake']);
  assert.deepEqual(storeSections(getBuilder('fishers-quality-products')).map(s => s.name), ['Cribs', 'Changing tables', 'Nightstands']);
  assert.equal(storeSection(getBuilder('old-town-oak'), 'french-country')?.name, 'French Country');
  assert.equal(storeSection(getBuilder('old-town-oak'), 'nope'), null);
});

test('a section counts and prices only that builder\'s browsable pieces', () => {
  for (const b of BUILDERS) {
    const sections = storeSections(b);
    const products = storeProducts(b);
    assert.equal(sections.reduce((n, s) => n + s.count, 0), products.length, `${b.name}: sections miss a piece`);
    for (const s of sections) {
      assert.ok(s.count > 0);
      assert.equal(s.fromPrice, Math.min(...s.products.map(p => p.minPrice)), `${s.name}: from price is not the catalog's`);
      assert.ok(s.products.every(p => p.builder === b.id && p.category !== 'Guard Rails & Conversions'));
    }
  }
});

test('Kids Comfort has a store with no sections, no photo, no price', () => {
  const kc = getBuilder('kids-comfort');
  assert.equal(kc.listed, false);
  assert.equal(kc.banner, undefined);
  assert.equal(storeProducts(kc).length, 0);
  const page = read(ROUTES[1]);
  assert.ok(page.includes('Available on request') && page.includes('<TalkToPerson'), 'on-request block missing');
});

test('pieces with no builder get no store and stay in the catalog', () => {
  const orphans = getProductIndex().filter(p => !p.builder);
  assert.ok(orphans.length > 0);
  const stocked = new Set(BUILDERS.flatMap(b => storeProducts(b).map(p => p.slug)));
  assert.ok(orphans.every(p => !stocked.has(p.slug)));
});

test('the sitemap has listed stores and their sections, and leaves out a listed: false builder', () => {
  const urls = sitemap().map(e => e.url);
  for (const b of BUILDERS.filter(x => x.listed)) {
    assert.ok(urls.some(u => u.endsWith(b.href)), `${b.name} store missing`);
    for (const s of storeSections(b)) assert.ok(urls.some(u => u.endsWith(`${b.href}/${s.slug}`)), `${s.name} section missing`);
  }
  assert.ok(!urls.some(u => u.includes('/builders/kids-comfort')), 'unlisted builder store must not be submitted');
});

test('banner photos exist, are catalog photos and name no wood', () => {
  for (const b of BUILDERS.filter(x => x.banner)) {
    assert.match(b.banner!.image, /^\/(data\/products|images\/builders)\//);
    assert.ok(existsSync(join(root, 'public', decodeURI(b.banner!.image))), `${b.name} banner file missing`);
    assert.ok(!/\b(maple|cherry|oak|walnut|elm)\b/i.test(b.banner!.alt.replaceAll(b.name, '')), `${b.name} banner alt names a wood`);
  }
});

test('the catalog rules refuse a bad banner and accept a good one', () => {
  const codes = (banner: unknown) => {
    const catalog = loadCatalog(root, { images: false });
    const entry = catalog.builders.find((e: { fileId: string }) => e.fileId === 'old-town-oak')!;
    entry.record.banner = banner;
    entry.bannerInfo = typeof (banner as { image?: unknown })?.image === 'string' && (banner as { image: string }).image.includes('missing') ? { missing: true } : { format: 'jpeg', width: 1200, height: 1000, bytes: 1 };
    return validateCatalog(catalog).filter((f: { code: string; where: string }) => f.where.includes('banner')).map((f: { code: string }) => f.code);
  };
  const good = '/data/products/Addison%20Chest/a.jpg';
  assert.deepEqual(codes({ image: good, alt: 'A six-drawer dresser with curved feet' }), []);
  assert.ok(codes('nope').includes('banner-invalid'));
  assert.ok(codes({ image: 'https://example.com/a.jpg', alt: 'A dresser' }).includes('banner-invalid'));
  assert.ok(codes({ image: '/data/products/x/missing.jpg', alt: 'A dresser' }).includes('banner-missing'));
  assert.ok(codes({ image: good, alt: 'A brown maple dresser' }).includes('banner-wood'));
  assert.ok(codes({ image: good, alt: '' }).includes('banner-invalid'));
});

test('story statements are named, verbatim-shaped and carry no claim', () => {
  const codes = (story: unknown) => {
    const catalog = loadCatalog(root, { images: false });
    catalog.builders.find((e: { fileId: string }) => e.fileId === 'fishers-quality-products')!.record.story = story;
    return validateCatalog(catalog).filter((f: { where: string }) => f.where.includes('story')).map((f: { code: string }) => f.code);
  };
  assert.deepEqual(codes([{ text: 'A sentence from a catalog.', source: 'Fisher catalog, 2024' }]), []);
  assert.ok(codes('nope').includes('story-invalid'));
  assert.ok(codes([null]).includes('story-invalid'));
  assert.ok(codes([{ text: 'No source given.' }]).includes('quote-no-source'));
  assert.ok(codes([{ text: 'Tested to every standard.', source: 'Fisher catalog, 2024' }]).includes('story-claim'));
  assert.ok(codes([{ text: 'Built by Amish craftsmen.', source: 'Fisher catalog, 2024' }]).includes('story-claim'));
});

test('the store renders the story from the record, credited From <builder>, with no woods section', () => {
  const home = read(ROUTES[1]);
  assert.ok(home.includes('builder.story.map') && home.includes('<cite>From {builder.name}</cite>'));
  assert.ok(!/woods and finishes/i.test(home), 'the store must not carry a woods section');
  for (const b of BUILDERS) {
    for (const entry of b.story ?? []) assert.ok(entry.text.trim() && entry.source.trim(), `${b.name}: empty story entry`);
  }
});

function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

test('the builder-name highlight meets WCAG AA and the comment records the measured contrast', () => {
  const css = read('src/app/globals.css');
  const hex = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
  const [charcoal, linen, solid] = [hex('ink')!, hex('paper')!, hex('store-green')!];
  assert.equal(solid.toLowerCase(), '#9dbe9e');
  assert.match(css, /--builder-highlight:\s*rgba\(157,\s*190,\s*158,\s*0?\.5\)/);
  const blended = '#' + [1, 3, 5].map(i => Math.round((parseInt(solid.slice(i, i + 2), 16) + parseInt(linen.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0')).join('');
  const contrast = (bg: string) => (luminance(bg) + 0.05) / (luminance(charcoal) + 0.05);
  for (const bg of [blended, solid]) assert.ok(contrast(bg) >= 4.5, `contrast on ${bg} is ${contrast(bg).toFixed(2)}`);
  assert.ok(css.includes(`${contrast(blended).toFixed(2)}:1`), 'the highlight contrast must be recorded beside the token');
  assert.ok(css.includes(`${contrast(solid).toFixed(2)}:1`), 'the hover contrast must be recorded beside the token');
  const site = read('src/styles/site.css');
  assert.match(site, /a\.builder-name \{[^}]*background: var\(--builder-highlight\)/);
  assert.match(site, /a\.builder-name:focus-visible \{[^}]*outline/);
  assert.ok(!/\.store-banner[^{]*\{[^}]*background: var\(--store-green\)/.test(site) && !/\.store-bar[^{]*\{[^}]*background/.test(site), 'store banners stay on linen');
});

test('copy rules hold across the store templates and the directory', () => {
  const banned = [
    /in [^.`]{0,30}\bwords\b/i,
    /not heirloom/i,
    /\bwe (don.t|do not) (build|make)\b/i,
    /heirloom (builds?|makes|crafts)/i,
    /by heirloom/i,
    /nothing on file/i,
    /\bamish\b/i,
    /made in usa/i,
  ];
  for (const f of [...ROUTES, 'src/components/builders/StoreBanner.tsx', 'src/components/builders/BuilderDirectory.tsx', 'src/app/builders/page.tsx']) {
    const s = read(f);
    for (const re of banned) assert.ok(!re.test(s), `${f} contains ${re}`);
  }
});

test('every builder name on cards, compare and the cart links to its store', () => {
  assert.ok(read('src/components/shop/PieceLink.tsx').includes('builder-name'));
  for (const f of ['src/components/compare/CompareView.tsx', 'src/components/dock/TrayPanel.tsx', 'src/components/checkout/CheckoutClient.tsx', 'src/components/pick/PickRun.tsx', 'src/components/product/PieceDetails.tsx', 'src/app/builders/page.tsx', 'src/components/builders/BuilderDirectory.tsx']) {
    assert.ok(read(f).includes('builder-name'), `${f} has no builder-name highlight`);
  }
  assert.ok(read('src/components/shop/PieceLink.tsx').includes('href={item.builderHref}'));
  assert.ok(read('src/components/compare/CompareView.tsx').includes('s.item.builderHref'));
  assert.ok(read('src/components/dock/TrayPanel.tsx').includes('href={line.builder.href}'));
  assert.ok(read('src/components/checkout/CheckoutClient.tsx').includes('href={item.builder.href}'));
  assert.ok(read('src/app/product/[slug]/[[...variant]]/page.tsx').includes('href={builder.href}'));
});
