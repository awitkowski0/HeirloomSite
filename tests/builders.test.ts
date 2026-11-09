import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { BUILDERS, CASE_GOOD_CATEGORIES, builderForProduct, safetyAnswerFor, getBuilder } from '../src/lib/builders';

const words = (s: string) => s.toLowerCase().replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);

/*
 * The registry may only repeat what the sourced builder pages already say.
 * A statement that exists nowhere else has no source behind it.
 */
const SOURCES: Record<string, string[]> = {
  'old-town-oak': ['src/app/builders/old-town-oak/page.tsx'],
  'fishers-quality-products': ['src/app/builders/fishers-quality-products/page.tsx'],
  'kids-comfort': ['src/app/builders/kids-comfort/page.tsx', 'src/app/safety/page.tsx'],
};

test('every builder quote is verbatim from a sourced page', () => {
  for (const b of BUILDERS) {
    const source = SOURCES[b.id].map(f => readFileSync(f, 'utf8')).join('\n');
    const quotes = [b.intro, b.construction, b.setup, b.safety.crib, b.safety.caseGoods];
    for (const q of quotes) {
      if (q) assert.ok(source.includes(q.text), `${b.name}: not found in source: ${q.text.slice(0, 60)}`);
    }
  }
});

test('every chip uses only the words of the statement it summarises', () => {
  for (const b of BUILDERS) {
    const checks = [
      ...[b.safety.crib, b.safety.caseGoods].flatMap(q => (q?.features ?? []).map(f => [f, q!.text])),
      ...[...b.buildFeatures.crib, ...b.buildFeatures.caseGoods].map(f => [f, b.construction?.text ?? '']),
    ];
    for (const [feature, text] of checks) {
      const source = new Set(words(text.replace(/[.,]/g, ' ')));
      for (const w of words(feature)) assert.ok(source.has(w), `${b.name}: "${w}" in chip "${feature}" is not in its source`);
    }
  }
});

test('every crib has a look tag', () => {
  const src = readFileSync('src/lib/shop.ts', 'utf8');
  const root = 'public/data/products';
  for (const dir of readdirSync(root)) {
    const file = `${root}/${dir}/product.json`;
    if (!existsSync(file)) continue;
    const p = JSON.parse(readFileSync(file, 'utf8'));
    if (p.hidden || !['Cribs', 'Mini Cribs'].includes(p.category)) continue;
    assert.ok(src.includes(`${p.slug}`), `${p.productName} has no look`);
  }
});

test('every listed crib and case piece names its builder', () => {
  const root = 'public/data/products';
  const named = ['Cribs', 'Mini Cribs', ...CASE_GOOD_CATEGORIES];
  for (const dir of readdirSync(root)) {
    const file = `${root}/${dir}/product.json`;
    if (!existsSync(file)) continue;
    const p = JSON.parse(readFileSync(file, 'utf8'));
    if (p.hidden || !named.includes(p.category)) continue;
    assert.ok(builderForProduct(p), `${p.productName} has no builder`);
  }
});

test('a statement is only shown where it applies', () => {
  const oto = getBuilder('old-town-oak');
  assert.equal(safetyAnswerFor(oto, 'Cribs').kind, 'statement');
  assert.equal(safetyAnswerFor(oto, 'Dressers').kind, 'statement');
  assert.equal(safetyAnswerFor(oto, 'Mini Cribs').kind, 'missing', '16 CFR 1219 is the full-size rule');
  assert.equal(safetyAnswerFor(oto, 'Guard Rails & Conversions').kind, 'not-applicable');
  assert.equal(safetyAnswerFor(getBuilder('fishers-quality-products'), 'Cribs').kind, 'missing');
});

test('no country-of-origin claim enters the registry', () => {
  const src = readFileSync('src/lib/builders.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(src, /made in (the )?(usa|america|u\.s\.)|american[- ]made|american materials/i);
});
