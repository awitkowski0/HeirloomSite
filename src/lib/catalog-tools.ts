import 'server-only';

import { builderForProduct, featuresFor, safetyAnswerFor } from '@/lib/builders';
import { getBrowsableProducts } from '@/lib/content';
import { CRIB_STYLES, type CribStyleId } from '@/lib/crib-styles';
import { absoluteUrl } from '@/lib/seo';
import { toShopItems } from '@/lib/shop';

/*
 * The read-only catalog that the live chat and outside AI agents both use, so
 * neither can describe a piece differently from the site. Safety text is only
 * ever a builder's verbatim statement, with its source.
 */
export const ATTRIBUTION =
  'Heirloom Cribs & More does not build furniture and makes no safety claims of its own. Any safety statement here is the named builder\'s own and must be attributed to that builder.';

export interface CatalogPiece {
  slug: string;
  name: string;
  type: string | null;
  url: string;
  price_from_usd: number;
  builder: string | null;
  builder_location: string | null;
  lead_time: string | null;
  lead_weeks_max: number | null;
  style: string | null;
  finish_options: number;
  construction_per_builder: string[];
  safety_statement: { statement: string; source: string; said_by: string } | null;
}

export function getCatalog(): CatalogPiece[] {
  const products = getBrowsableProducts();
  const items = toShopItems(products);
  return products.map((product, index) => {
    const item = items[index];
    const builder = builderForProduct(product);
    const safety = builder ? safetyAnswerFor(builder, product.category) : null;
    return {
      slug: item.slug,
      name: item.name,
      type: item.category,
      url: absoluteUrl(`/product/${item.slug}`),
      price_from_usd: item.price,
      builder: item.builder,
      builder_location: builder?.based ?? null,
      lead_time: item.leadTime,
      lead_weeks_max: item.leadWeeksMax,
      style: CRIB_STYLES.find(s => s.id === item.style)?.label ?? null,
      finish_options: item.finishes,
      construction_per_builder: builder ? featuresFor(builder, product.category).build : [],
      safety_statement:
        builder && safety?.kind === 'statement'
          ? { statement: safety.quote.text, source: safety.quote.source, said_by: builder.name }
          : null,
    };
  });
}

const TYPES = ['Cribs', 'Mini Cribs', 'Dressers', 'Chests', 'Changing Tables', 'Nightstands'] as const;
export const MAX_COMPARE = 3;
const MAX_RESULTS = 12;

const nullableEnum = (values: readonly string[], description: string) => ({
  type: ['string', 'null'] as string[],
  enum: [...values, null] as (string | null)[],
  description,
});

export const CATALOG_TOOLS = [
  {
    name: 'search_catalog',
    description:
      'Find nursery furniture in the catalog by type, crib style, budget, and timing. Use null for any filter that does not apply. Returns at most 12 pieces, lowest price first.',
    input_schema: {
      type: 'object' as const,
      additionalProperties: false,
      required: ['type', 'style', 'max_price_usd', 'max_lead_weeks'],
      properties: {
        type: nullableEnum(TYPES, 'The kind of furniture.'),
        style: nullableEnum(CRIB_STYLES.map(s => s.id), 'Crib style. Only applies to cribs.'),
        max_price_usd: { type: ['number', 'null'], description: 'Highest starting price in US dollars.' },
        max_lead_weeks: { type: ['number', 'null'], description: 'Longest acceptable lead time in weeks.' },
      },
    },
  },
  {
    name: 'compare_pieces',
    description:
      'Compare two or three pieces side by side using slugs from search_catalog. Includes each builder\'s own safety statement when one is on file.',
    input_schema: {
      type: 'object' as const,
      additionalProperties: false,
      required: ['slugs'],
      properties: {
        slugs: { type: 'array', items: { type: 'string' }, description: 'Two or three product slugs.' },
      },
    },
  },
];

export class CatalogToolError extends Error {}

export function comparePieces(slugs: unknown): CatalogPiece[] {
  if (!Array.isArray(slugs) || slugs.length < 2 || slugs.length > MAX_COMPARE) {
    throw new CatalogToolError(`Provide 2 to ${MAX_COMPARE} product slugs.`);
  }
  const catalog = getCatalog();
  return slugs.map(slug => {
    const piece = catalog.find(p => p.slug === slug);
    if (!piece) throw new CatalogToolError(`Unknown product slug: ${String(slug)}`);
    return piece;
  });
}

function searchCatalog(input: Record<string, unknown>): CatalogPiece[] {
  const style = input.style as CribStyleId | null | undefined;
  const label = CRIB_STYLES.find(s => s.id === style)?.label;
  const maxPrice = typeof input.max_price_usd === 'number' ? input.max_price_usd : null;
  const maxWeeks = typeof input.max_lead_weeks === 'number' ? input.max_lead_weeks : null;
  return getCatalog()
    .filter(
      p =>
        (!input.type || p.type === input.type) &&
        (!label || p.style === label) &&
        (maxPrice === null || p.price_from_usd <= maxPrice) &&
        (maxWeeks === null || (p.lead_weeks_max !== null && p.lead_weeks_max <= maxWeeks)),
    )
    .sort((a, b) => a.price_from_usd - b.price_from_usd)
    .slice(0, MAX_RESULTS);
}

/** Runs one named tool. Throws CatalogToolError on bad input. */
export function runCatalogTool(name: string, input: Record<string, unknown>): { attribution: string; pieces: CatalogPiece[] } {
  if (name === 'search_catalog') return { attribution: ATTRIBUTION, pieces: searchCatalog(input) };
  if (name === 'compare_pieces') return { attribution: ATTRIBUTION, pieces: comparePieces(input.slugs) };
  throw new CatalogToolError(`Unknown tool: ${name}`);
}
