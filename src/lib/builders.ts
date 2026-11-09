/*
 * Who makes what, and what each builder says about it.
 *
 * Every `text` below is a builder's own words, copied verbatim from the sourced
 * builder pages under src/app/builders (or /safety). tests/builders.test.ts
 * fails if one drifts. This file is allow-listed in
 * tests/safety-claims-guard.test.ts for that reason, and for no other: never add
 * a line here in Heirloom's voice.
 *
 * `null` means nothing is on file, and the UI says so rather than filling the
 * gap. Fisher's has no safety statement on file. Add one only from a document
 * Fisher's has actually given you.
 *
 * Deliberately absent: any statement about where materials come from. "Made in
 * USA" and "American materials" are FTC-regulated claims (16 CFR 323) and no
 * builder document on file supports them. `based` is where a shop is, which is
 * all the record shows.
 */

export type BuilderId = 'old-town-oak' | 'fishers-quality-products' | 'kids-comfort';

export interface BuilderQuote {
  text: string;
  source: string;
  /** Short chips. Every word must appear in `text` (tests/builders.test.ts). */
  features?: string[];
}

export interface Builder {
  id: BuilderId;
  name: string;
  href: string;
  based: string;
  background: string;
  intro: BuilderQuote;
  leadTime: string;
  leadWeeksMax: number;
  /** Short chips by piece type. Every word must appear in `construction` or be empty. */
  buildFeatures: { crib: string[]; caseGoods: string[] };
  /** False while its pieces are available on request rather than in the catalogue. */
  listed: boolean;
  construction: BuilderQuote | null;
  setup: BuilderQuote | null;
  safety: {
    crib: BuilderQuote | null;
    caseGoods: BuilderQuote | null;
  };
}

const OTO_CATALOG = 'Old Town Oak, 2026 catalog';
const KC_CATALOG = 'Kids Comfort catalog, January 2023';

export const BUILDERS: readonly Builder[] = [
  {
    id: 'old-town-oak',
    name: 'Old Town Oak',
    href: '/builders/old-town-oak',
    based: 'Topeka, Indiana',
    background: 'In business for 21 years, according to its 2026 catalog',
    intro: {
      text: 'Having been in business for 21 years, we can offer you the quality cribs and dressers you expect and deserve.',
      source: OTO_CATALOG,
    },
    leadTime: 'About 6 to 8 weeks',
    leadWeeksMax: 8,
    buildFeatures: {
      crib: ['Mortise and tenon joints', 'Steel inserts and connector bolts'],
      caseGoods: ['Dovetail wood drawer boxes', 'Full extension slides'],
    },
    listed: true,
    construction: {
      text: 'Our cribs are sturdy and durable with mortise and tenon joints and a substructure made of steel inserts and connector bolts. Our dressers feature dovetail wood drawer boxes and full extension slides, all features that make sure our baby furniture will stand the test of time.',
      source: OTO_CATALOG,
    },
    setup: {
      text: 'Tool and hardware kit comes standard attached to every crib spring with easy to read and understand instructions. Panels are specially marked for ease of assembly.',
      source: OTO_CATALOG,
    },
    safety: {
      crib: {
        text: 'All cribs conform to Consumer Product Safety Commission (CPSC) 16CFR1219 and ASTM F1169-19 standards and are up to date with all regulations tested through certified third party labs.',
        source: OTO_CATALOG,
        features: ['CPSC 16CFR1219', 'ASTM F1169-19', 'Certified third party labs'],
      },
      caseGoods: {
        text: 'For the compliancy and safety sake for our customers and each and every one of us, we chose to use a rear mount interlock system along with counterweights as needed to be fully compliant while still maintaining a full extension drawer. Warning and extension labels are applied as needed. A General Certificate of Conformity is filed as we test each style per wood species.',
        source: OTO_CATALOG,
        features: ['Rear mount interlock system', 'Counterweights as needed', 'Warning and extension labels', 'General Certificate of Conformity'],
      },
    },
  },
  {
    id: 'fishers-quality-products',
    name: "Fisher's Quality Products",
    href: '/builders/fishers-quality-products',
    based: 'Quarryville, Pennsylvania',
    background: 'Describes itself as family-owned; began with one line of cribs in 2010',
    intro: {
      text: 'We started very small out of our home shop, manufacturing just one line of cribs in 2010.',
      source: "Fisher's Quality Products, from its profile on All American Wholesalers",
    },
    leadTime: '10 to 14 weeks',
    leadWeeksMax: 14,
    buildFeatures: { crib: [], caseGoods: [] },
    listed: true,
    construction: null,
    setup: null,
    safety: { crib: null, caseGoods: null },
  },
  {
    id: 'kids-comfort',
    name: 'Kids Comfort',
    href: '/builders/kids-comfort',
    based: 'Sugarcreek, Ohio',
    background: "Joe Troyer's shop",
    intro: {
      text: 'We are real people that answer our phone and personally work with you to accomplish your goals.',
      source: `Joe Troyer, ${KC_CATALOG}`,
    },
    leadTime: 'About 8 weeks',
    leadWeeksMax: 8,
    buildFeatures: { crib: ['Completely solid wood including the mattress support'], caseGoods: [] },
    listed: false,
    construction: {
      text: 'All cribs are completely solid wood including the mattress support.',
      source: 'Kids Comfort',
    },
    setup: null,
    safety: {
      crib: {
        text: 'As always all Kids Comfort cribs are fully convertible, and are tested and certified to CPSIA and ASTM federal standards.',
        source: KC_CATALOG,
        features: ['Tested and certified to CPSIA and ASTM'],
      },
      caseGoods: {
        text: 'All furniture pieces come with a wall anchor to prevent tipping hazards in your nursery.',
        source: KC_CATALOG,
        features: ['Wall anchor'],
      },
    },
  },
];

export function getBuilder(id: BuilderId): Builder {
  const builder = BUILDERS.find(b => b.id === id);
  if (!builder) throw new Error(`Unknown builder: ${id}`);
  return builder;
}

/* The ranges and pieces each builder page lists as that builder's. */
const OTO_COLLECTIONS = new Set(['Addison', 'French Country', 'Mackenzie', 'Newport', 'West Lake']);
const FISHERS_PRODUCTS = new Set([
  'Arched Top',
  'Bloomington',
  'Darlington',
  'Hudson',
  'Mission',
  'Moyerton',
  'Princeton',
  'Changing Table - 6 Drawer',
  'Nightstand - 2 Drawer',
]);

/**
 * The builder of a piece, or null when the record does not say.
 *
 * Null is a real answer: the shared rail kits are bundled with cribs from more
 * than one builder, and nothing on file names who makes the crib mattress.
 */
export function builderForProduct(product: {
  productName: string;
  collection?: string | null;
}): Builder | null {
  if (product.collection && OTO_COLLECTIONS.has(product.collection)) {
    return getBuilder('old-town-oak');
  }
  if (FISHERS_PRODUCTS.has(product.productName)) {
    return getBuilder('fishers-quality-products');
  }
  return null;
}

export const CASE_GOOD_CATEGORIES: readonly string[] = [
  'Dressers',
  'Chests',
  'Nightstands',
  'Changing Tables',
];

export type SafetyAnswer =
  | { kind: 'statement'; quote: BuilderQuote }
  | { kind: 'missing' }
  | { kind: 'not-applicable' };

/**
 * What to show for one piece.
 *
 * Mini cribs are `missing` even for Old Town Oak: its crib statement cites
 * 16 CFR 1219, the full-size rule, and non-full-size cribs fall under 16 CFR
 * 1220. Showing that sentence on a mini crib would attach the wrong standard.
 */
export function safetyAnswerFor(builder: Builder, category: string | null | undefined): SafetyAnswer {
  if (category === 'Mini Cribs') return { kind: 'missing' };
  let quote: BuilderQuote | null;
  if (category === 'Cribs') quote = builder.safety.crib;
  else if (category && CASE_GOOD_CATEGORIES.includes(category)) quote = builder.safety.caseGoods;
  else return { kind: 'not-applicable' };
  return quote ? { kind: 'statement', quote } : { kind: 'missing' };
}

/** The chips for one piece: what the builder says about how it is built and its safety. */
export function featuresFor(
  builder: Builder,
  category: string | null | undefined,
): { build: string[]; safety: string[] } {
  const answer = safetyAnswerFor(builder, category);
  const isCrib = category === 'Cribs' || category === 'Mini Cribs';
  const isCase = Boolean(category && CASE_GOOD_CATEGORIES.includes(category));
  return {
    build: isCrib ? builder.buildFeatures.crib : isCase ? builder.buildFeatures.caseGoods : [],
    safety: answer.kind === 'statement' ? (answer.quote.features ?? []) : [],
  };
}

export function missingStatementCopy(builderName: string): string {
  return `We don't have a written statement from ${builderName} to show for this piece yet. Ask us and we'll request it from the shop.`;
}
