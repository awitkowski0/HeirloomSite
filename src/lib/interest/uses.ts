/*
 * What the profile is for: ordering suggestions, picking the next This or That
 * pair, the "Your taste so far" line, and saying why something was suggested.
 *
 * Every function here is pure and takes a profile, so a storefront can call them
 * from a render. Confidence scales every effect down: with little evidence a
 * ranking is the catalogue's own order, and an explanation is null rather than
 * a guess.
 */
import { NURSERY_SLOTS, finishFamily, type InterestCatalogItem } from './catalog';
import { pairKey, type ConfidenceLevel, type FacetEntry, type InterestProfile } from './profile';

/**
 * Put this class on any element that renders profile text.
 *
 * Session replay reads DOM text and HeyCatch autocaptures element text. Without
 * it, showing someone their taste would hand it to the third parties it must
 * never reach.
 */
export const INTEREST_PRIVATE_CLASS = 'ph-mask ph-no-capture';

const STRENGTH: Record<ConfidenceLevel, number> = { none: 0, low: 0.35, medium: 0.75, high: 1 };
const SPEAKS: readonly ConfidenceLevel[] = ['medium', 'high'];

function shareOf(list: FacetEntry[], id: string | null | undefined): number {
  return list.find(e => e.id === id)?.share ?? 0;
}

function slotFor(item: InterestCatalogItem) {
  return NURSERY_SLOTS.find(s => s.pieceTypes.includes(item.pieceType)) ?? null;
}

export interface SuggestionReason {
  kind: 'style' | 'finish' | 'builder' | 'price' | 'fills-room';
  text: string;
}

export interface Suggestion {
  item: InterestCatalogItem;
  score: number;
  reasons: SuggestionReason[];
}

function reasonsFor(profile: InterestProfile, item: InterestCatalogItem): SuggestionReason[] {
  if (!SPEAKS.includes(profile.confidence.level)) return [];
  const reasons: SuggestionReason[] = [];

  if (profile.leadingStyle && item.style === profile.leadingStyle.id) {
    reasons.push({ kind: 'style', text: `Because you've been looking at ${profile.leadingStyle.label.toLowerCase()}.` });
  }
  const family = profile.leadingFinishFamily;
  if (family && item.finishes.some(f => finishFamily(f) === family.id)) {
    reasons.push({ kind: 'finish', text: `It comes in the ${family.label} you've been choosing.` });
  }
  const slot = slotFor(item);
  if (
    slot?.core &&
    profile.nursery.filled > 0 &&
    profile.nursery.slots.find(s => s.id === slot.id)?.state !== 'held'
  ) {
    reasons.push({ kind: 'fills-room', text: `You don't have a ${slot.label} set aside yet.` });
  }
  if (profile.builderLean && item.builderId === profile.builderLean.id) {
    reasons.push({ kind: 'builder', text: `Built by ${profile.builderLean.label}, like most of what you've been looking at.` });
  }
  const range = profile.priceRange;
  if (range && item.price >= range.low && item.price <= range.high && reasons.length === 0) {
    reasons.push({ kind: 'price', text: 'In the price range you have been looking at.' });
  }
  return reasons;
}

export interface RankOptions {
  limit?: number;
  /** Pieces already on the page, or anything else not to suggest. */
  exclude?: Iterable<string>;
  /** Pass a de-listing check, such as useDelistedProducts().isDelisted inverted. */
  isAvailable?: (slug: string) => boolean;
}

/** The catalogue, best match first. With no evidence, the catalogue's own order. */
export function rankSuggestions(
  profile: InterestProfile,
  catalog: readonly InterestCatalogItem[],
  options: RankOptions = {},
): Suggestion[] {
  const exclude = new Set(options.exclude ?? []);
  const strength = STRENGTH[profile.confidence.level];

  const scored = catalog.flatMap((item, index) => {
    const known = profile.pieces[item.slug];
    if (!item.listed || exclude.has(item.slug)) return [];
    if (options.isAvailable && !options.isAvailable(item.slug)) return [];
    if (known?.saved || known?.inCart || known?.removed) return [];

    const families = item.finishes.map(finishFamily).filter(f => f !== null);
    const finish = Math.max(0, ...families.map(f => shareOf(profile.finishFamilies, f)));

    let affinity =
      3 * shareOf(profile.styles, item.style) +
      1 * shareOf(profile.pieceTypes, item.pieceType) +
      1.5 * finish +
      0.75 * (profile.builderLean?.id === item.builderId ? 1 : 0);

    if (profile.setAside.includes(item.styleLabel ?? '')) affinity -= 1.5;

    const range = profile.priceRange;
    if (range) {
      if (item.price >= range.low && item.price <= range.high) affinity += 0.75;
      else if (item.price > range.high * 1.25) affinity -= 0.75;
    }

    const slot = slotFor(item);
    if (slot?.core && profile.nursery.filled > 0) {
      // A held slot outweighs any style match: nobody needs a second crib suggested.
      affinity += profile.nursery.slots.find(s => s.id === slot.id)?.state === 'held' ? -8 : 1.5;
    }

    const score = strength * affinity - index * 1e-6;
    return [{ item, score, reasons: reasonsFor(profile, item) }];
  });

  scored.sort((a, b) => b.score - a.score);
  return options.limit === undefined ? scored : scored.slice(0, options.limit);
}

/** One sentence on why a piece is suggested, or null when there is nothing honest to say. */
export function explainSuggestion(profile: InterestProfile, item: InterestCatalogItem): string | null {
  return reasonsFor(profile, item)[0]?.text ?? null;
}

export interface TasteLine {
  label: 'Your taste so far';
  text: string;
}

/** The short "Your taste so far" line. Null until there is a pattern to state. */
export function tasteLine(profile: InterestProfile): TasteLine | null {
  const { leadingStyle: style, leadingFinishFamily: family, confidence } = profile;
  if (confidence.level === 'none') return null;
  const parts = [style?.label.toLowerCase(), family?.label].filter(Boolean);
  if (parts.length === 0) return null;
  const text = parts.join(', ');
  return { label: 'Your taste so far', text: confidence.level === 'low' ? `Early days: ${text}` : text };
}

export interface ThisOrThatPair {
  id?: string;
  a: string;
  b: string;
}

export interface NextPair {
  pair: ThisOrThatPair;
  why: 'new-style' | 'close-call' | 'fresh-pair';
}

/** Every crib pairing across two styles, for when no curated pairs are supplied. */
export function catalogPairs(catalog: readonly InterestCatalogItem[]): ThisOrThatPair[] {
  const cribs = catalog.filter(c => c.pieceType === 'crib' && c.style && c.listed);
  const pairs: ThisOrThatPair[] = [];
  for (let i = 0; i < cribs.length; i += 1) {
    for (let j = i + 1; j < cribs.length; j += 1) {
      if (cribs[i].style !== cribs[j].style) pairs.push({ a: cribs[i].slug, b: cribs[j].slug });
    }
  }
  return pairs;
}

/**
 * The pair that would teach the most, or null when every pair has been answered.
 *
 * A style not yet tried comes first, then the closest call between two styles,
 * since a decision between two near-equal leaders is the most informative. Pairs
 * already answered are never shown again. Ties break by list order, so the same
 * log always yields the same pair.
 */
export function chooseNextPair(
  profile: InterestProfile,
  catalog: readonly InterestCatalogItem[],
  pairs: readonly ThisOrThatPair[] = catalogPairs(catalog),
): NextPair | null {
  const styleOf = new Map(catalog.map(c => [c.slug, c.style]));
  const judged = new Set(profile.judgedPairs);
  const tried = new Set<string>();
  for (const key of judged) {
    for (const slug of key.split('|')) {
      const style = styleOf.get(slug);
      if (style) tried.add(style);
    }
  }

  let best: NextPair | null = null;
  let bestScore = -Infinity;
  for (const pair of pairs) {
    if (judged.has(pairKey(pair.a, pair.b))) continue;
    const a = styleOf.get(pair.a) ?? null;
    const b = styleOf.get(pair.b) ?? null;
    const unseen = [a, b].filter(s => s && !tried.has(s)).length;
    const gap = Math.abs(shareOf(profile.styles, a) - shareOf(profile.styles, b));
    const score = (a !== b ? 1 : 0.2) + unseen * 0.8 + (1 - gap) * 0.7;
    if (score > bestScore) {
      bestScore = score;
      best = { pair, why: unseen > 0 ? 'new-style' : a !== b && gap < 0.2 ? 'close-call' : 'fresh-pair' };
    }
  }
  return best;
}
