import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getInventory } from '../src/lib/content';
import { merchantFeedXml } from '../src/lib/merchant-feed';
import { BUILDERS } from '../src/lib/seo';
import {
  FEED_TITLE_NAMES,
  TYPED_TITLE_NAMES,
  productTitleName,
} from '../src/lib/product-title';

/*
 * Pricing App #307: product titles follow the live OTO pattern
 * `<Model> <Type>[ in <Stain>]`. Builder names stay in g:brand / JSON-LD
 * brand only. The 17 live feed titles that started with "Fisher " were
 * produced by FEED_TITLE_NAMES.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

function tags(xml: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}


/**
 * Builder words present in data (BUILDERS names and SKU codes) plus the
 * common long forms. A title must not start with any of these.
 */
function builderTitlePrefix(): RegExp {
  const names = new Set<string>();
  for (const [code, row] of Object.entries(BUILDERS)) {
    names.add(code);
    names.add(row.name);
  }
  names.add("Fisher's Quality Products");
  names.add("Fisher's");
  names.add("Kid's Comfort");
  const alt = [...names].map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`^(?:${alt})\\b`, 'i');
}

test('typed title names drop the builder and keep the product type', () => {
  assert.equal(productTitleName('arched-top', 'Arched Top'), 'Arched Top Crib');
  assert.equal(productTitleName('mission', 'Mission'), 'Mission Crib');
  assert.equal(productTitleName('addison-crib', 'Addison Crib'), 'Addison Crib');
  assert.equal(
    productTitleName('mini-newport-with-mattress', 'Mini Newport with Mattress'),
    'Mini Newport with Mattress',
  );
  assert.equal(FEED_TITLE_NAMES['mini-newport-with-mattress'], 'Mini Newport Crib with Mattress');
  for (const [slug, name] of Object.entries(TYPED_TITLE_NAMES)) {
    assert.equal(FEED_TITLE_NAMES[slug], name);
    assert.doesNotMatch(name, builderTitlePrefix(), name);
    assert.match(name, /Crib$/);
  }
});

test('no product title starts with a builder name', () => {
  const prefix = builderTitlePrefix();
  const xml = merchantFeedXml(getInventory());
  const titles = tags(xml, 'g:title');
  assert.equal(titles.length, 136);
  for (const title of titles) {
    assert.doesNotMatch(title, prefix, title);
  }
  for (const name of Object.values(FEED_TITLE_NAMES)) {
    assert.doesNotMatch(name, prefix, name);
  }
  for (const item of getInventory()) {
    const display = productTitleName(item.slug ?? undefined, item.productName);
    const label = item.wood ? String(item.wood).replace(/_/g, ' ') : '';
    // The feed/page title is display, or display + " in " + stain/wood label.
    assert.doesNotMatch(display, prefix, display);
    if (label) assert.doesNotMatch(`${display} in ${label}`, prefix);
  }
});

test('the 17 previously prefixed Fisher crib titles and their brand/link stay correct', () => {
  const xml = merchantFeedXml(getInventory());
  const items = xml.split('<item>').slice(1).map(chunk => '<item>' + chunk.split('</item>')[0] + '</item>');
  const byLink = new Map<string, string>();
  for (const item of items) {
    const link = tags(item, 'g:link')[0];
    if (link) byLink.set(link, item);
  }
  const links = [
    'https://heirloomcribsandmore.com/product/arched-top/antique_slate',
    'https://heirloomcribsandmore.com/product/arched-top/driftwood',
    'https://heirloomcribsandmore.com/product/arched-top/frost',
    'https://heirloomcribsandmore.com/product/arched-top/fruitwood',
    'https://heirloomcribsandmore.com/product/arched-top/harvest',
    'https://heirloomcribsandmore.com/product/arched-top/mx',
    'https://heirloomcribsandmore.com/product/arched-top/natural',
    'https://heirloomcribsandmore.com/product/arched-top/provincial',
    'https://heirloomcribsandmore.com/product/arched-top/seely',
    'https://heirloomcribsandmore.com/product/arched-top/smoke',
    'https://heirloomcribsandmore.com/product/arched-top/washington',
    'https://heirloomcribsandmore.com/product/bloomington/brown_maple',
    'https://heirloomcribsandmore.com/product/darlington/brown_maple',
    'https://heirloomcribsandmore.com/product/hudson/brown_maple',
    'https://heirloomcribsandmore.com/product/mission/brown_maple',
    'https://heirloomcribsandmore.com/product/moyerton/brown_maple',
    'https://heirloomcribsandmore.com/product/princeton/brown_maple',
  ];
  const wantTitle: Record<string, string> = {
    'https://heirloomcribsandmore.com/product/arched-top/antique_slate': 'Arched Top Crib in Antique Slate',
    'https://heirloomcribsandmore.com/product/arched-top/driftwood': 'Arched Top Crib in Driftwood',
    'https://heirloomcribsandmore.com/product/arched-top/frost': 'Arched Top Crib in Frost',
    'https://heirloomcribsandmore.com/product/arched-top/fruitwood': 'Arched Top Crib in Fruitwood',
    'https://heirloomcribsandmore.com/product/arched-top/harvest': 'Arched Top Crib in Harvest',
    'https://heirloomcribsandmore.com/product/arched-top/mx': 'Arched Top Crib in Mx',
    'https://heirloomcribsandmore.com/product/arched-top/natural': 'Arched Top Crib in Natural',
    'https://heirloomcribsandmore.com/product/arched-top/provincial': 'Arched Top Crib in Provincial',
    'https://heirloomcribsandmore.com/product/arched-top/seely': 'Arched Top Crib in Seely',
    'https://heirloomcribsandmore.com/product/arched-top/smoke': 'Arched Top Crib in Smoke',
    'https://heirloomcribsandmore.com/product/arched-top/washington': 'Arched Top Crib in Washington',
    'https://heirloomcribsandmore.com/product/bloomington/brown_maple': 'Bloomington Crib in Brown Maple',
    'https://heirloomcribsandmore.com/product/darlington/brown_maple': 'Darlington Crib in Brown Maple',
    'https://heirloomcribsandmore.com/product/hudson/brown_maple': 'Hudson Crib in Brown Maple',
    'https://heirloomcribsandmore.com/product/mission/brown_maple': 'Mission Crib in Brown Maple',
    'https://heirloomcribsandmore.com/product/moyerton/brown_maple': 'Moyerton Crib in Brown Maple',
    'https://heirloomcribsandmore.com/product/princeton/brown_maple': 'Princeton Crib in Brown Maple',
  };
  assert.equal(links.length, 17);
  for (const link of links) {
    const item = byLink.get(link);
    assert.ok(item, `missing feed item for ${link}`);
    assert.equal(tags(item!, 'g:title')[0], wantTitle[link]);
    assert.equal(tags(item!, 'g:brand')[0], 'Fisher');
    assert.equal(tags(item!, 'g:link')[0], link);
  }
});

test('product page title, H1, og:title and JSON-LD name use productTitleName', () => {
  const page = read('src/app/product/[slug]/[[...variant]]/page.tsx');
  assert.ok(page.includes("import { TYPED_TITLE_NAMES, productTitleName } from '@/lib/product-title'"));
  assert.ok(page.includes('productTitleName(slug, product.productName)'));
  assert.ok(page.includes('`${displayName} in ${variantName}`'));
  assert.ok(page.includes('<h1 className="product-title">{displayName}</h1>'));
  assert.doesNotMatch(page, /TODO/i);
});

test('#307 base product <title>/og:title use the typed name, matching the H1', () => {
  // The stored title is "Arched Top"; without this the base page's <title>
  // and og:title say "Arched Top" while its H1 says "Arched Top Crib".
  const page = read('src/app/product/[slug]/[[...variant]]/page.tsx');
  assert.ok(page.includes('const baseTitle = TYPED_TITLE_NAMES[slug] ?? stripSiteSuffix('));
});
