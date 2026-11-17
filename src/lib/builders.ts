import type { BuilderCode } from '@/lib/seo';

/**
 * The builders Heirloom resells, one row each, in the order the /builders
 * directory lists them.
 *
 * `id` is the URL segment (/builders/<id>) and must not change: these are
 * live, indexed URLs. `code` is the SKU prefix, which is how a product is
 * matched to its builder (the same key the merchant feed's g:brand reads in
 * src/lib/seo.ts). `tag` is the short name on a listing card's builder chip.
 *
 * The pages' copy is NOT here. Each builder's banner and story live in
 * src/components/builders/content/<id>.tsx, moved verbatim from the old
 * per-builder pages.
 */
export interface Builder {
  id: string;
  code: BuilderCode;
  name: string;
  tag: string;
  href: string;
  /** As the About page states it; confirmed when the customer orders. */
  leadTime: string;
}

export const BUILDERS: readonly Builder[] = [
  {
    id: 'old-town-oak',
    code: 'OTO',
    name: 'Old Town Oak',
    tag: 'Old Town Oak',
    href: '/builders/old-town-oak',
    leadTime: 'About 6 to 8 weeks',
  },
  {
    id: 'fishers-quality-products',
    code: 'FQP',
    name: "Fisher's Quality Products",
    tag: "Fisher's",
    href: '/builders/fishers-quality-products',
    leadTime: '10 to 14 weeks',
  },
  {
    id: 'kids-comfort',
    code: 'KC',
    name: 'Kids Comfort',
    tag: 'Kids Comfort',
    href: '/builders/kids-comfort',
    leadTime: 'About 8 weeks',
  },
];

export function builderById(id: string): Builder | null {
  return BUILDERS.find(b => b.id === id) ?? null;
}

export function builderByCode(code: BuilderCode | null): Builder | null {
  return code ? (BUILDERS.find(b => b.code === code) ?? null) : null;
}
