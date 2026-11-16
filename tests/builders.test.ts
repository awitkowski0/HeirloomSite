import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { BUILDERS, CASE_GOOD_CATEGORIES, builderForProduct, safetyAnswerFor, getBuilder } from '../src/lib/builders';
import { CRIB_STYLES } from '../src/lib/crib-styles';

const words = (s: string) => s.toLowerCase().replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);

/*
 * Each sentence on file, pinned word for word. Stores render these records and
 * add nothing, so a changed statement is a change to the builder's words: change
 * the record and this table together, from the source document.
 */
const STATEMENTS: Record<string, readonly string[]> = {
  'old-town-oak': [
    'Having been in business for 21 years, we can offer you the quality cribs and dressers you expect and deserve.',
    'Specializing in Baby Furniture.',
    'every piece is signed by the artisan, Marlin Miller.',
    'Each crib is designed with a unique three stage system that adjusts with the age or size of your child. Use one piece of furniture for your child from newborn into adulthood.',
    'Our cribs are sturdy and durable with mortise and tenon joints and a substructure made of steel inserts and connector bolts. Our dressers feature dovetail wood drawer boxes and full extension slides, all features that make sure our baby furniture will stand the test of time.',
    'Tool and hardware kit comes standard attached to every crib spring with easy to read and understand instructions. Panels are specially marked for ease of assembly.',
    'All cribs conform to Consumer Product Safety Commission (CPSC) 16CFR1219 and ASTM F1169-19 standards and are up to date with all regulations tested through certified third party labs.',
    'For the compliancy and safety sake for our customers and each and every one of us, we chose to use a rear mount interlock system along with counterweights as needed to be fully compliant while still maintaining a full extension drawer. Warning and extension labels are applied as needed. A General Certificate of Conformity is filed as we test each style per wood species.',
  ],
  'fishers-quality-products': [
    'We started very small out of our home shop, manufacturing just one line of cribs in 2010.',
    'a family-owned business',
    'While working for a local woodshop for over 10 years, we noticed an increased demand for cribs coming into the shop.',
    'So, owner Joseph Fisher decided to start his own business … We started very small out of our home shop, manufacturing just one line of cribs in 2010. We have worked our way up to manufacturing a full line of convertible cribs, convertible changing tables, chests of drawers, and night stands.',
    'We know how difficult and expensive it can be to transition children from cribs, to toddler beds, to day beds, to full sized beds, so we make it easy.',
    'Toddler Bed/Day Bed Conversion Kits include day bed frame, toddler bed rail, and hardware',
    'Our Full Size Bed Conversion Kit includes bed rails, slats, and hardware',
  ],
  'kids-comfort': [
    'We are real people that answer our phone and personally work with you to accomplish your goals.',
    'All cribs are completely solid wood including the mattress support.',
    'As always all Kids Comfort cribs are fully convertible, and are tested and certified to CPSIA and ASTM federal standards.',
    'All furniture pieces come with a wall anchor to prevent tipping hazards in your nursery.',
  ],
};

test('every builder statement on file is the pinned verbatim sentence, and nothing more', () => {
  for (const b of BUILDERS) {
    const pinned = STATEMENTS[b.id];
    if (!pinned) continue; // A builder added with the scaffold is held to a named source by the catalog rules.
    const onFile = [b.intro, ...(b.story ?? []), b.construction, b.setup, b.safety.crib, b.safety.caseGoods].flatMap(q => (q ? [q.text] : []));
    assert.deepEqual(onFile, pinned, `${b.name}: statements on file differ from the pinned sentences`);
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

test('every crib declares a valid style', () => {
  const styles = new Set(CRIB_STYLES.map(s => s.id as string));
  const root = 'public/data/products';
  for (const dir of readdirSync(root)) {
    const file = `${root}/${dir}/product.json`;
    if (!existsSync(file)) continue;
    const p = JSON.parse(readFileSync(file, 'utf8'));
    if (p.hidden || !['Cribs', 'Mini Cribs'].includes(p.category)) continue;
    assert.ok(styles.has(p.style), `${p.productName} has no valid style (${p.style})`);
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
  const code = readFileSync('src/lib/builders.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const records = readdirSync('data/builders').map(f => readFileSync(`data/builders/${f}`, 'utf8'));
  for (const src of [code, ...records]) {
    assert.doesNotMatch(src, /made in (the )?(usa|america|u\.s\.)|american[- ]made|american materials/i);
  }
});
