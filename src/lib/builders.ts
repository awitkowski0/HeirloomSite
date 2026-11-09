import { possessive } from '@/lib/names';
/*
 * Who makes what, and what each builder says about it.
 *
 * The records are data: data/builders/<id>.json, one per builder, validated by
 * scripts/lib/catalog-rules.mjs and emitted to src/data/builders.json by
 * scripts/build-data.mjs. Add one with `npm run catalog:add-builder`; nothing
 * here needs editing. A record's `text` fields are the builder's own words,
 * copied verbatim from a named document. Never add a line in Heirloom's voice.
 *
 * `null` means nothing is on file, and the UI says so rather than filling the
 * gap. Add a statement only from a document the builder has actually given you.
 *
 * Deliberately absent: any statement about where materials come from. "Made in
 * USA" and "American materials" are FTC-regulated claims (16 CFR 323). `based`
 * is where a shop is, which is all the record shows.
 */

import records from '@/data/builders.json';

export type BuilderId = string;

export interface BuilderQuote {
  text: string;
  /** The named document this was copied from, word for word. */
  source: string;
  /** Only when the document is a web page. Requires retrievedOn. */
  sourceUrl?: string;
  retrievedOn?: string;
  /** Short chips. Every word must appear in `text` (checked by the catalog rules). */
  features?: string[];
}

export interface Builder {
  id: BuilderId;
  name: string;
  href: string;
  /** Display order on /builders. */
  order: number;
  based: string;
  background: string;
  intro: BuilderQuote;
  leadTime: string;
  leadWeeksMax: number;
  /** Short chips by piece type. Every word must appear in `construction` or be empty. */
  buildFeatures: { crib: string[]; caseGoods: string[] };
  /** False while its pieces are available on request rather than in the catalogue. */
  listed: boolean;
  /** True when src/app/builders/<id>/ holds a hand-written page. */
  bespokePage: boolean;
  /** SKU prefix, Merchant feed brand and handling window (business days). */
  sku: {
    prefix: string;
    brand: string;
    handlingDays: { min: number; max: number };
    baseMaterial: string | null;
  };
  construction: BuilderQuote | null;
  setup: BuilderQuote | null;
  safety: {
    crib: BuilderQuote | null;
    caseGoods: BuilderQuote | null;
  };
}

export const BUILDERS: readonly Builder[] = records as unknown as Builder[];

export function getBuilder(id: BuilderId): Builder {
  const builder = BUILDERS.find(b => b.id === id);
  if (!builder) throw new Error(`Unknown builder: ${id}`);
  return builder;
}

/**
 * The builder of a piece, or null when the record does not say.
 *
 * Reads `builder` from the product record (validated at build time). Null is a
 * real answer: the shared rail kits are bundled with cribs from more than one
 * builder, and nothing on file names who makes the crib mattress.
 */
export function builderForProduct(product: { builder?: string | null }): Builder | null {
  return product.builder ? getBuilder(product.builder) : null;
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
  return `We can request ${possessive(builderName)} written safety statement for you. Just ask.`;
}
