/**
 * The browse taxonomy: what the nav offers, and what each node contains.
 *
 * DECLARED, not derived. Categories used to be counted out of the catalogue -
 * whatever `category` values products happened to carry became the nav. That
 * cannot express the shop the site is growing into: Clothing, Bath, Newborn
 * Must-Haves, Gift Sets and Toys are real categories with real descriptions and
 * no stock yet, and a list computed from products can only ever show what
 * already exists.
 *
 * So the tree lives here and products are mapped INTO it. `sources` names the
 * `category` values in product.json that land at a node; a node with no sources
 * is one the shop has not stocked yet.
 *
 * Empty nodes are hidden rather than removed. src/lib/content.ts prunes any
 * node with no products before the nav or the sitemap sees it, so an unstocked
 * category costs nothing and appears the moment its first product declares the
 * matching category - no code change, no deploy of this file.
 *
 * URLs stay FLAT. A sub-menu node is /products/<its own slug>, not
 * /products/<parent>/<child>: the hierarchy is a navigation affordance, and
 * nesting it into the path would rename every existing category URL and buy
 * nothing a crawler or a customer can use.
 */

export interface TaxonomyNode {
  name: string;
  slug: string;
  /** Shown on the category page and used as its meta description. */
  description: string;
  /**
   * `category` values in product.json that belong here. A parent's products are
   * its own sources plus everything under its children.
   */
  sources: readonly string[];
  children?: readonly TaxonomyNode[];
}

/**
 * Categories that are deliberately NOT browsable.
 *
 * The conversion kits and the crib mattress ship with the crib and are sold
 * through the bundle builder on the product page. They are still real,
 * routed, priced products - a hidden product would be dropped from
 * pricing.json and could not be bought at all, which would break every crib
 * bundle - they simply do not appear in the nav, the grids or search.
 *
 * The trade this makes: someone who needs a REPLACEMENT rail kit cannot find
 * one by browsing or searching, only by direct link. Giving them a home is one
 * entry in the tree below if that turns out to matter.
 */
export const UNLISTED_CATEGORIES: readonly string[] = [
  'Guard Rails & Conversions',
  'Accessories',
];

export function isUnlistedCategory(category: string | null | undefined): boolean {
  return category != null && UNLISTED_CATEGORIES.includes(category);
}

/**
 * The tree, in the order it appears in the nav.
 *
 * Merchandising order, deliberately not alphabetical and not by product count:
 * someone furnishing a nursery is here for the crib first.
 */
export const TAXONOMY: readonly TaxonomyNode[] = [
  {
    name: 'Cribs',
    slug: 'cribs',
    description:
      'Solid hardwood convertible cribs, handcrafted to grow with your child from newborn to full bed.',
    sources: [],
    children: [
      {
        name: 'All Cribs',
        slug: 'all-cribs',
        description:
          'Complete range of solid hardwood convertible cribs, each sold with bundled conversion rail kit and mattress.',
        sources: ['Cribs'],
      },
      {
        name: 'Mini Cribs',
        slug: 'mini-cribs',
        description:
          'Space-saving solid hardwood mini cribs ideal for smaller rooms or secondary sleep spaces.',
        sources: ['Mini Cribs'],
      },
    ],
  },
  /*
   * Top level, not under a "Nursery Furniture" parent.
   *
   * That parent had no products of its own - it existed only to hold these two
   * - so it was a click between the nav and the pieces, offering a choice the
   * sub-menu was already showing. The slugs are unchanged, so every URL and the
   * retired-category redirects in next.config.ts still land where they did.
   */
  {
    name: 'Dressers & Changing Tables',
    slug: 'dressers-changing-tables',
    description:
      'Solid hardwood dressers and changing pieces designed to perfectly match your crib collection.',
    sources: ['Dressers', 'Changing Tables'],
  },
  {
    name: 'Nightstands & Storage',
    slug: 'nightstands-storage',
    description:
      'Complementary storage furniture that creates a complete, cohesive nursery look.',
    sources: ['Nightstands', 'Chests'],
  },
  {
    name: 'Nursery',
    slug: 'nursery',
    description:
      'Rugs, lighting, bedding and décor chosen to sit alongside heirloom furniture.',
    sources: [],
    children: [
      {
        name: 'Decor',
        slug: 'decor',
        description:
          'Rugs, lighting and nursery décor that complement your heirloom furniture.',
        sources: ['Area Rugs', 'Lamps'],
      },
      {
        name: 'Bedding',
        slug: 'bedding',
        description:
          'Coordinating crib sheets, blankets and nursery textiles that complement your heirloom furniture.',
        sources: [],
      },
    ],
  },
  {
    name: 'Clothing',
    slug: 'clothing',
    description:
      'Everyday baby clothing, bodysuits, sleepers, shoes, hats and wearable accessories for infants and toddlers.',
    sources: ['Clothing'],
  },
  {
    name: 'Bath',
    slug: 'bath',
    description: 'Essentials for bath-time routines.',
    sources: ['Bath'],
  },
  {
    name: 'Newborn Must-Haves',
    slug: 'newborn-must-haves',
    description: 'Essentials every new parent needs in the first weeks and months.',
    sources: ['Newborn Must-Haves'],
  },
  {
    name: 'Gift Sets',
    slug: 'gift-sets',
    description:
      'Ready-to-give curated boxes and multi-item sets ideal for showers and new-baby gifts.',
    sources: ['Gift Sets'],
  },
  {
    name: 'Toys',
    slug: 'toys',
    description:
      'High-quality wooden toys and play items selected to pair beautifully with classic nursery furniture.',
    sources: ['Toys'],
  },
];

/** Every node, parents before their children. */
export function flattenTaxonomy(
  nodes: readonly TaxonomyNode[] = TAXONOMY
): TaxonomyNode[] {
  return nodes.flatMap(node => [node, ...flattenTaxonomy(node.children ?? [])]);
}

/** The `category` values a node covers, including everything under it. */
export function sourcesFor(node: TaxonomyNode): string[] {
  return [...node.sources, ...(node.children ?? []).flatMap(sourcesFor)];
}

/**
 * Every category value the tree can display.
 *
 * Used to assert at build time that no product has been left with nowhere to
 * go: a category that is neither in the tree nor deliberately unlisted is a
 * product nobody can ever browse to, and silently dropping it is exactly the
 * failure this catches.
 */
export function knownCategories(): Set<string> {
  return new Set([...TAXONOMY.flatMap(sourcesFor), ...UNLISTED_CATEGORIES]);
}
