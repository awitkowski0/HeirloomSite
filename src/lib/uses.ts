/*
 * What a piece can be. Validated per product in scripts/lib/catalog-rules.mjs.
 * There is no BASSINET tag on purpose: nothing on file is a bassinet, and a crib
 * must never be described as one.
 */
export const USE_TAGS = [
  { tag: 'CRIB', slug: 'crib' },
  { tag: 'TODDLER BED', slug: 'toddler-bed' },
  { tag: 'DAY BED', slug: 'day-bed' },
  { tag: 'FULL BED', slug: 'full-bed' },
  { tag: 'MINI', slug: 'mini' },
  { tag: 'DRESSER', slug: 'dresser' },
  { tag: 'CHANGING TABLE', slug: 'changing-table' },
  { tag: 'HUTCH', slug: 'hutch' },
  { tag: 'MIRROR', slug: 'mirror' },
] as const;

export const BED_STAGES: readonly string[] = ['TODDLER BED', 'DAY BED', 'FULL BED'];

export function tagHref(tag: string): string {
  const slug = USE_TAGS.find(u => u.tag === tag)?.slug;
  return slug ? `/uses/${slug}` : '/products';
}
