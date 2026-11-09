import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CASE_GOOD_CATEGORIES } from '../src/lib/builders';
import { CRIB_STYLES } from '../src/lib/crib-styles';
import { knownCategories } from '../src/lib/taxonomy';
import {
  CASE_GOOD_CATEGORIES as RULES_CASE_GOODS,
  isCentSafe,
  loadCatalog,
  readVocabulary,
  sha256,
  validateCatalog,
} from '../scripts/lib/catalog-rules.mjs';

/*
 * The catalog tooling's rules. A fresh load of the real catalog is mutated in
 * memory, so these write nothing. The CLI cases run --dry-run for the same reason.
 */
const root = process.cwd();

function freshCatalog() {
  return loadCatalog(root, { images: false });
}

function codesFor(mutate: (c: ReturnType<typeof freshCatalog>) => void, at?: string): string[] {
  const catalog = freshCatalog();
  mutate(catalog);
  return validateCatalog(catalog)
    .filter((f: { level: string; where: string }) => f.level === 'error' && (!at || f.where.startsWith(at)))
    .map((f: { code: string }) => f.code);
}

const product = (c: ReturnType<typeof freshCatalog>, dir: string) => {
  const found = c.products.find((p: { dirName: string }) => p.dirName === dir);
  assert.ok(found, `no product ${dir}`);
  return found;
};

test('the real catalog has no errors', () => {
  const errors = validateCatalog(freshCatalog()).filter((f: { level: string }) => f.level === 'error');
  assert.deepEqual(errors, []);
});

test('vocabulary read from the TypeScript sources matches them exactly', () => {
  const { categories, styles } = readVocabulary(root);
  assert.deepEqual([...categories].sort(), [...knownCategories()].sort());
  assert.deepEqual([...styles].sort(), CRIB_STYLES.map(s => s.id as string).sort());
  assert.deepEqual([...RULES_CASE_GOODS].sort(), [...CASE_GOOD_CATEGORIES].sort());
});

test('a missing variantType is an error', () => {
  assert.ok(codesFor(c => { delete product(c, 'Hudson').meta.variantType; }, 'Hudson').includes('variant-type-missing'));
});

test('a composite variant name is an error', () => {
  const codes = codesFor(c => { product(c, 'Hudson').variants[0].variant = 'BrownMaple / Antique Slate'; }, 'Hudson');
  assert.ok(codes.includes('variant-composite'));
});

test('an unknown or absent builder is an error, null only outside furniture', () => {
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.builder = 'no-such-shop'; }).includes('builder-unknown'));
  assert.ok(codesFor(c => { delete product(c, 'Hudson').meta.builder; }).includes('builder-missing'));
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.builder = null; }).includes('builder-required'));
  assert.deepEqual(codesFor(c => { product(c, 'Crib Mattress').meta.builder = null; }), []);
});

test('a crib needs a valid style and only a crib may carry one', () => {
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.style = 'gothic'; }).includes('style-invalid'));
  assert.ok(codesFor(c => { product(c, 'Crib Mattress').meta.style = 'classic-slats'; }).includes('style-not-applicable'));
});

test('a safety statement needs a named source, and may stay null', () => {
  const edit = (quote: unknown) => (c: ReturnType<typeof freshCatalog>) => {
    const fisher = c.builders.find((b: { fileId: string }) => b.fileId === 'fishers-quality-products')!;
    fisher.record.safety.crib = quote;
  };
  assert.ok(codesFor(edit({ text: 'Tested to the standard.' })).includes('safety-no-source'));
  assert.ok(codesFor(edit({ text: 'Tested to the standard.', source: '' })).includes('safety-no-source'));
  assert.ok(codesFor(edit({ text: 'Tested to the standard.', source: "Fisher's Quality Products" })).includes('quote-source-vague'));
  assert.ok(codesFor(edit({ text: 'Tested.', source: 'https://example.com/page' })).includes('quote-source-url'));
  assert.ok(codesFor(edit({ text: 'Tested.', source: 'The page', sourceUrl: 'https://example.com/page' })).includes('quote-source-undated'));
  assert.deepEqual(codesFor(edit({ text: 'Tested.', source: 'The 2026 catalog' })), []);
  assert.deepEqual(codesFor(edit(null)), []);
});

test('a safety chip cannot add words the statement does not contain', () => {
  const codes = codesFor(c => {
    const oto = c.builders.find((b: { fileId: string }) => b.fileId === 'old-town-oak')!;
    oto.record.safety.crib.features = ['Lab certified guaranteed'];
  });
  assert.ok(codes.includes('quote-chip-not-verbatim'));
});

test('a product cannot carry its own safety statement or a price outside variants', () => {
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.safety = 'Very safe'; }).includes('claim-field'));
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.price = 1950; }).includes('price-misplaced'));
});

test('forbidden claims and stock phrases are rejected in new copy', () => {
  const cases: [string, string][] = [
    ['Made in the USA from solid wood.', 'copy-origin-claim'],
    ['Built by American makers.', 'copy-origin-claim'],
    ['Handcrafted in Ohio by the shop.', 'copy-origin-claim'],
    ['An Amish tradition of joinery.', 'copy-origin-claim'],
    ['A non-toxic finish.', 'copy-safety-claim'],
    ['Lead-free paint.', 'copy-safety-claim'],
    ['Certified to ASTM.', 'copy-safety-claim'],
    ['A safe choice.', 'copy-safety-claim'],
    ['A timeless crib.', 'copy-stock-phrase'],
    ['This will elevate the room.', 'copy-stock-phrase'],
    ['Beautifully proportioned.', 'copy-stock-phrase'],
    ['Slats on all sides.\n\nUse Get Personal Assistance for help.', 'copy-boilerplate'],
  ];
  for (const [text, code] of cases) {
    const codes = codesFor(c => { product(c, 'Hudson').meta.description = text; }, 'Hudson description');
    assert.ok(codes.includes(code), `${text} -> ${codes}`);
  }
});

test('copy may not name a wood the product is not sold in', () => {
  const codes = codesFor(c => {
    const p = product(c, 'Hudson');
    p.meta.soldWoods = ['Brown Maple'];
    p.meta.description = 'A crib in solid walnut with square posts.';
  }, 'Hudson description');
  assert.ok(codes.includes('copy-unsold-wood'));
});

test('editing grandfathered copy removes its exemption', () => {
  const c = freshCatalog();
  const p = product(c, 'Mission');
  const baseline = c.legacyCopy[p.meta.slug];
  assert.equal(baseline.description, sha256(p.meta.description));
  p.meta.description = `${p.meta.description} `.replace('Mission', 'Mission Crib');
  const errors = validateCatalog(c).filter((f: { level: string; where: string }) => f.level === 'error' && f.where === 'Mission description');
  assert.ok(errors.some((f: { code: string }) => f.code.startsWith('copy-')));
});

test('a colliding slug is an error, and removing a live slug needs a redirect', () => {
  assert.ok(codesFor(c => { product(c, 'Darlington').meta.slug = 'hudson'; }).includes('slug-collision'));
  const removal = codesFor(c => { c.products = c.products.filter((p: { dirName: string }) => p.dirName !== 'Hudson'); }, '/product/hudson');
  assert.ok(removal.includes('slug-removed'));
  const redirected = codesFor(c => {
    c.products = c.products.filter((p: { dirName: string }) => p.dirName !== 'Hudson');
    c.nextConfig += "\n{ source: '/product/hudson', destination: '/products', permanent: true },";
  }, '/product/hudson');
  assert.deepEqual(redirected, []);
});

test('a bad bundle slug, a bundle row with real choices and a self-reference are errors', () => {
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.bundle = ['crib-matress']; }).includes('relation-unknown'));
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.bundle = ['west-lake-crib']; }).includes('relation-bundle-choice'));
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.related = ['hudson']; }).includes('relation-self'));
});

test('prices must be cent-safe', () => {
  assert.ok(isCentSafe(1950));
  assert.ok(isCentSafe(1759.2));
  assert.ok(!isCentSafe(1759.123));
  assert.ok(!isCentSafe(0));
  assert.ok(!isCentSafe('1950'));
  assert.ok(codesFor(c => { product(c, 'Hudson').variants[0].basePrice = 1950.005; }).includes('price-invalid'));
});

test('a non-legacy product must carry its intake record and sold woods', () => {
  const codes = codesFor(c => {
    const hudson = product(c, 'Hudson');
    c.legacySlugs.delete('hudson');
    delete hudson.meta.photos;
    hudson.meta.soldWoods = undefined;
  }, 'Hudson');
  assert.ok(codes.includes('photos-missing'));
  assert.ok(codes.includes('sold-woods-missing'));
});

test('the frozen baseline covers exactly the existing catalog and cannot grow quietly', () => {
  const baseline = JSON.parse(readFileSync('data/catalog-baseline.json', 'utf8'));
  // Adding to this list is how a new product would dodge the intake rules.
  assert.equal(baseline.legacySlugs.length, 74);
  const live = new Set(JSON.parse(readFileSync('data/live-slugs.json', 'utf8')));
  for (const slug of baseline.legacySlugs) assert.ok(live.has(slug), `${slug} is not a live slug`);
});

test('the scaffold CLI refuses bad input in a dry run and writes nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalog-'));
  const productDirs = () => readdirSync('public/data/products').length;
  const before = productDirs();
  try {
    const run = (input: unknown, command = 'add-product') => {
      const file = join(dir, 'input.json');
      writeFileSync(file, JSON.stringify(input));
      try {
        execFileSync(process.execPath, ['scripts/catalog.mjs', command, file, '--dry-run'], { stdio: 'pipe' });
        return { code: 0, out: '' };
      } catch (error) {
        const e = error as { status: number; stdout: Buffer };
        return { code: e.status, out: String(e.stdout) };
      }
    };
    const good = {
      productName: 'Tooling Check Crib',
      category: 'Cribs',
      builder: 'old-town-oak',
      style: 'classic-slats',
      uses: ['CRIB'],
      variantType: 'wood',
      soldWoods: ['Brown Maple'],
      description: 'A crib with square posts and a flat top rail.',
      metaDescription: 'A crib with square posts and a flat top rail.',
      variants: [{ variant: 'BrownMaple', label: 'Brown Maple', stains: ['Natural'], basePrice: 1500, sku: 'OTO-9000' }],
      photos: { rights: 'builder-permission', rightsSource: 'Old Town Oak 2026 catalog', matchesSoldWood: 'yes' },
    };
    assert.equal(run(good).code, 0);
    const noPhotos = { ...good, photos: undefined };
    const cases: [object, string][] = [
      [{ ...good, variantType: undefined }, 'variant-type-missing'],
      [{ ...good, builder: 'made-up-shop' }, 'builder-unknown'],
      [{ ...good, productName: 'Hudson', slug: 'hudson' }, 'REFUSED'],
      [{ ...good, description: 'Made in USA.' }, 'copy-origin-claim'],
      [{ ...good, bundle: ['nope-not-a-slug'] }, 'relation-unknown'],
      [{ ...good, safety: 'Very safe' }, 'REFUSED'],
      [noPhotos, 'photos-missing'],
    ];
    for (const [input, expected] of cases) {
      const result = run(input);
      assert.equal(result.code, 1, `${expected} should fail`);
      assert.ok(result.out.includes(expected), `${expected} not reported:\n${result.out}`);
    }
    const noSource = {
      name: 'Tooling Check Shop', based: 'Town, Ohio', background: 'A small shop', intro: { text: 'We build cribs.', source: 'Letter' },
      leadTime: '8 weeks', leadWeeksMax: 8, sku: { prefix: 'TCS', brand: 'Tooling Check Shop', handlingDays: { min: 40, max: 56 } },
      safety: { crib: { text: 'Tested to the standard.' } },
    };
    const result = run(noSource, 'add-builder');
    assert.equal(result.code, 1);
    assert.ok(result.out.includes('safety-no-source'), result.out);
    assert.equal(productDirs(), before, 'a dry run must not create product directories');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('uses tags must be backed by the record', () => {
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.uses = ['BASSINET']; }).includes('uses-invalid'));
  assert.ok(codesFor(c => { delete product(c, 'Hudson').meta.uses; }).includes('uses-missing'));
  assert.ok(codesFor(c => { product(c, 'Hudson').meta.bundle = []; }).includes('uses-unsupported'));
  assert.ok(codesFor(c => { product(c, 'Mini Newport with Mattress').meta.uses = ['MINI', 'TODDLER BED']; }).includes('uses-unsupported'));
  assert.ok(codesFor(c => { delete product(c, 'Changing Table - 6 Drawer').meta.usesCredit; }).includes('uses-unsupported'));
});
