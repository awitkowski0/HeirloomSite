import { humanizeWood, stainLabel } from './labels';
import type { InventoryItem } from '@/types';

/**
 * Path segments for wood and finish, so a configuration has a real URL:
 *
 *   /product/bloomington/cherry_wood/antique_slate
 *
 * These were previously only reachable as ?wood=&stain= query parameters,
 * which meant every finish of every product shared one URL - nothing for a
 * crawler to index, and nothing a customer could send to someone else.
 *
 * Underscores rather than hyphens: several product names already contain
 * hyphens ("3/4 Guard Rail" slugifies with them), so an underscore keeps the
 * wood and finish segments visually distinct from the product slug.
 */
export function variantSlug(name: string): string {
  return humanizeWood(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Whether a finish segment adds anything to the wood segment.
 *
 * Still load-bearing after the composite "BrownMaple / Antique Slate" variants
 * were split: on a `finish`-type product the variant IS the finish, so each
 * variant carries a single stain of exactly the same name (variant "Driftwood",
 * stains ["Driftwood"]). Emitting a finish segment there would produce
 * /product/arched-top/driftwood/driftwood. Same containment test as
 * variantLabel(), so the URL and the visible label agree about when a finish is
 * redundant.
 */
export function stainIsDistinct(wood: string, stainName: string): boolean {
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const w = normalise(humanizeWood(wood));
  const s = normalise(stainLabel(stainName));
  if (!s) return false;
  return w !== s && !w.includes(s);
}

export interface ResolvedVariant {
  wood: string | null;
  stain: string | null;
}

/**
 * Turn URL segments back into the exact catalogue values.
 *
 * Returns null - which the page turns into a 404 - for a segment that matches
 * nothing, rather than silently falling back to the default configuration and
 * serving a 200 for a URL that does not exist.
 */
export function resolveVariant(
  configurations: InventoryItem[],
  segments: string[] | undefined
): ResolvedVariant | null {
  if (!segments || segments.length === 0) return { wood: null, stain: null };
  if (segments.length > 2) return null;

  const [woodSeg, stainSeg] = segments;
  const config = configurations.find(c => variantSlug(c.wood) === woodSeg);
  if (!config) return null;
  if (!stainSeg) return { wood: config.wood, stain: null };

  const stain = config.stains.find(
    s => stainIsDistinct(config.wood, s.name) && variantSlug(stainLabel(s.name)) === stainSeg
  );
  if (!stain) return null;
  return { wood: config.wood, stain: stain.name };
}

/** Every variant path for one product, base page included. */
export function variantPathsFor(configurations: InventoryItem[]): string[][] {
  const paths: string[][] = [[]];
  const seen = new Set<string>();

  for (const config of configurations) {
    /*
     * "Default Title" is a Shopify export artifact, not a choice a customer
     * makes. Emitting it as a segment gave all 43 single-variant products a
     * /<slug>/default_title page that was a byte-identical duplicate of
     * /<slug>, prerendered and submitted in the sitemap.
     */
    if (config.variantType === 'none') continue;
    const woodSeg = variantSlug(config.wood);
    if (!woodSeg || seen.has(woodSeg)) continue;
    seen.add(woodSeg);
    paths.push([woodSeg]);

    const stainSeen = new Set<string>();
    for (const stain of config.stains) {
      if (!stainIsDistinct(config.wood, stain.name)) continue;
      const stainSeg = variantSlug(stainLabel(stain.name));
      if (!stainSeg || stainSeen.has(stainSeg)) continue;
      stainSeen.add(stainSeg);
      paths.push([woodSeg, stainSeg]);
    }
  }

  return paths;
}

/** The canonical path for a product, optionally at a wood and finish. */
export function variantHref(slug: string, wood?: string | null, stainName?: string | null): string {
  if (!wood) return `/product/${slug}`;
  const woodSeg = variantSlug(wood);
  if (!stainName || !stainIsDistinct(wood, stainName)) return `/product/${slug}/${woodSeg}`;
  return `/product/${slug}/${woodSeg}/${variantSlug(stainLabel(stainName))}`;
}
