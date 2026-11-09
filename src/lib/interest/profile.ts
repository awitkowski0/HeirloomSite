/*
 * Turns a log of events plus the catalogue into a picture of someone's taste.
 *
 * Pure and deterministic: same log, same catalogue, same `now`, same profile,
 * so it can be tested without a browser. No model is involved. See SummaryWriter
 * below for where one could go later.
 *
 * Evidence moves through five steps, each with one job:
 *   1. cancel   a removal undoes the save or cart add it reverses
 *   2. dedupe   the same act on the same piece within 30 minutes counts once
 *   3. decay    each signal fades on its own half-life
 *   4. burst    passive evidence from one hour is capped across all pieces
 *   5. caps     per piece per kind, per piece overall, and a floor on negatives
 *
 * Nothing here infers who the shopper is. It describes furniture only: a style,
 * a finish family, a kind of piece, a price range, a maker. Any new output has
 * to pass tests/interest-profile.test.ts, which rejects language about
 * pregnancy, due dates, family or gender.
 */
import {
  BURST_PASSIVE_CAP,
  BURST_WINDOW_MS,
  DEDUPE_MS,
  INTEREST_KINDS,
  NEGATIVE_PIECE_FLOOR,
  PIECE_TOTAL_CAP,
  REJECTED_SIDE_WEIGHT,
  SIGNALS,
  type InterestEvent,
  type InterestKind,
} from './events';
import {
  finishFamily,
  FINISH_FAMILY_LABELS,
  FURNITURE_TYPES,
  nurseryProgress,
  pieceTypeLabel,
  type FinishFamily,
  type InterestCatalogItem,
  type NurseryProgress,
} from './catalog';

const DAY_MS = 24 * 60 * 60 * 1000;
/* Net evidence below this sets a style aside. One lost pairing is -0.75 and is not enough. */
const SET_ASIDE_BELOW = -2;

export type ConfidenceLevel = 'none' | 'low' | 'medium' | 'high';

export interface FacetEntry {
  id: string;
  label: string;
  /** Net evidence, floored at zero. */
  score: number;
  /** Fraction of the positive evidence in this facet, 0 to 1. */
  share: number;
  /** Distinct pieces behind it. */
  pieces: number;
  /** Separate positive events behind it. */
  support: number;
  /** Distinct calendar days it came up on. */
  days: number;
}

export interface PriceRange {
  /** Dollars, rounded outward to $50. A browsing range, never a quoted price. */
  low: number;
  high: number;
  basis: string;
  pieces: number;
}

export interface PieceEvidence {
  net: number;
  saved: boolean;
  inCart: boolean;
  sentToBabylist: boolean;
  /** Taken off a list and not put back. */
  removed: boolean;
}

export interface InterestConfidence {
  level: ConfidenceLevel;
  /** 0 to 1. */
  score: number;
  reason: string;
}

export interface ProfileActivity {
  events: number;
  pieces: number;
  days: number;
  byKind: Record<InterestKind, number>;
}

export interface InterestProfile {
  version: 1;
  generatedAt: number;
  confidence: InterestConfidence;
  styles: FacetEntry[];
  finishFamilies: FacetEntry[];
  pieceTypes: FacetEntry[];
  builders: FacetEntry[];
  leadingStyle: FacetEntry | null;
  leadingFinishFamily: FacetEntry | null;
  leadingPieceType: FacetEntry | null;
  /** Set only when the maker stands out beyond its share of the catalogue. */
  builderLean: FacetEntry | null;
  priceRange: PriceRange | null;
  nursery: NurseryProgress;
  /** Styles the evidence is net against. */
  setAside: string[];
  /** Per-piece evidence the suggestion ranker reads. */
  pieces: Record<string, PieceEvidence>;
  /** Pairs already answered in This or That, as sorted "a|b" keys. */
  judgedPairs: string[];
  activity: ProfileActivity;
  summary: { text: string; source: 'rules' | 'custom' };
}

/** Everything a summary is allowed to say. No events, slugs or timestamps. */
export interface SummaryFacts {
  confidence: ConfidenceLevel;
  style: { label: string; repeat: boolean } | null;
  finishFamily: { label: string; repeat: boolean } | null;
  pieceType: { label: string; repeat: boolean } | null;
  builder: string | null;
}

/**
 * The seam for a future LLM summary. Replace the deterministic writer by
 * passing one to synthesizeProfile, or call summaryFacts() and render later for
 * an asynchronous one. Anything that leaves the site with these facts is a new
 * third party and needs its own privacy review first; the facts are reduced to
 * aggregate labels so that the review has as little as possible to assess.
 */
export type SummaryWriter = (facts: SummaryFacts) => string;

interface Contribution {
  slug: string;
  kind: InterestKind;
  value: number;
  at: number;
  finish?: string;
  tier: 'passive' | 'explicit';
  /** Bears on a finish only: the rejected finish when both sides are one piece. */
  finishOnly?: boolean;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function decay(age: number, halfLifeDays: number): number {
  return 0.5 ** (Math.max(0, age) / (halfLifeDays * DAY_MS));
}

function scale(items: Contribution[], ceiling: number): void {
  const total = items.reduce((sum, c) => sum + c.value, 0);
  if (total <= ceiling || total === 0) return;
  const factor = ceiling / total;
  for (const c of items) c.value *= factor;
}

function groupBy(items: Contribution[], key: (c: Contribution) => string): Map<string, Contribution[]> {
  const groups = new Map<string, Contribution[]>();
  for (const item of items) {
    const k = key(item);
    const list = groups.get(k);
    if (list) list.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

interface Replay {
  contributions: Contribution[];
  pieces: Map<string, PieceEvidence>;
  judgedPairs: Set<string>;
  byKind: Record<InterestKind, number>;
  usable: number;
}

function replay(events: readonly InterestEvent[], knownSlugs: Set<string>, now: number): Replay {
  const sorted = [...events]
    .filter(e => knownSlugs.has(e.slug) && e.at <= now + DEDUPE_MS)
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

  // Step 1: a removal cancels the saves and adds before it, which is what makes
  // adding and then removing a piece net out rather than read as interest.
  const cancelled = new Set<string>();
  for (const removal of sorted.filter(e => e.kind === 'remove')) {
    for (const prior of sorted) {
      if (prior.at > removal.at || prior.slug !== removal.slug) continue;
      if (prior.kind === 'add_to_cart' && removal.from !== 'saved') cancelled.add(prior.id);
      if (prior.kind === 'save' && removal.from !== 'cart') cancelled.add(prior.id);
    }
  }

  const contributions: Contribution[] = [];
  const pieces = new Map<string, PieceEvidence>();
  const judgedPairs = new Set<string>();
  const byKind = Object.fromEntries(INTEREST_KINDS.map(k => [k, 0])) as Record<InterestKind, number>;
  const lastSeen = new Map<string, number>();

  const piece = (slug: string): PieceEvidence => {
    let p = pieces.get(slug);
    if (!p) {
      p = { net: 0, saved: false, inCart: false, sentToBabylist: false, removed: false };
      pieces.set(slug, p);
    }
    return p;
  };

  let usable = 0;
  for (const event of sorted) {
    const signal = SIGNALS[event.kind];
    byKind[event.kind] += 1;
    const state = piece(event.slug);
    if (event.kind === 'save') {
      state.saved = true;
      state.removed = false;
    }
    if (event.kind === 'add_to_cart') {
      state.inCart = true;
      state.removed = false;
    }
    if (event.kind === 'babylist') state.sentToBabylist = true;
    if (event.kind === 'remove') {
      if (event.from !== 'saved') state.inCart = false;
      if (event.from !== 'cart') state.saved = false;
      state.removed = true;
    }
    if (event.kind === 'this_or_that' && event.otherSlug) {
      judgedPairs.add(pairKey(event.slug, event.otherSlug));
    }

    // Step 2.
    const dedupeKey = `${event.kind}|${event.slug}|${event.finish ?? ''}|${event.otherSlug ?? ''}`;
    const previous = lastSeen.get(dedupeKey);
    if (previous !== undefined && event.at - previous < DEDUPE_MS) continue;
    lastSeen.set(dedupeKey, event.at);
    if (cancelled.has(event.id)) continue;
    usable += 1;

    // Step 3.
    const faded = decay(now - event.at, signal.halfLifeDays);
    contributions.push({
      slug: event.slug,
      kind: event.kind,
      value: signal.weight * faded,
      at: event.at,
      finish: event.finish,
      tier: signal.tier,
    });
    if (event.kind === 'this_or_that') {
      const samePiece = !event.otherSlug || event.otherSlug === event.slug;
      if (!samePiece && knownSlugs.has(event.otherSlug as string)) {
        contributions.push({
          slug: event.otherSlug as string,
          kind: event.kind,
          value: REJECTED_SIDE_WEIGHT * faded,
          at: event.at,
          finish: event.otherFinish,
          tier: signal.tier,
        });
      } else if (samePiece && event.otherFinish) {
        contributions.push({
          slug: event.slug,
          kind: event.kind,
          value: REJECTED_SIDE_WEIGHT * faded,
          at: event.at,
          finish: event.otherFinish,
          tier: signal.tier,
          finishOnly: true,
        });
      }
    }
  }

  // Step 4: a burst of clicks across many pieces is still one hour's attention.
  // Windows are anchored at the first event in each, so an hour boundary falling
  // inside a burst cannot split it and double the allowance.
  let window: Contribution[] = [];
  let windowStart = 0;
  for (const c of contributions.filter(x => x.tier === 'passive' && x.value > 0)) {
    if (window.length === 0 || c.at - windowStart >= BURST_WINDOW_MS) {
      scale(window, BURST_PASSIVE_CAP);
      window = [];
      windowStart = c.at;
    }
    window.push(c);
  }
  scale(window, BURST_PASSIVE_CAP);

  // Step 5.
  const positive = contributions.filter(c => c.value > 0);
  for (const group of groupBy(positive, c => `${c.slug}|${c.kind}`).values()) {
    scale(group, SIGNALS[group[0].kind].perPieceCap);
  }
  for (const group of groupBy(positive, c => c.slug).values()) {
    scale(group, PIECE_TOTAL_CAP);
  }
  const negative = contributions.filter(c => c.value < 0);
  for (const group of groupBy(negative, c => c.slug).values()) {
    const total = group.reduce((sum, c) => sum + c.value, 0);
    if (total < NEGATIVE_PIECE_FLOOR) {
      for (const c of group) c.value *= NEGATIVE_PIECE_FLOOR / total;
    }
  }

  for (const c of contributions) {
    if (!c.finishOnly) piece(c.slug).net += c.value;
  }
  return { contributions, pieces, judgedPairs, byKind, usable };
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

class Facet {
  private entries = new Map<string, { net: number; pieces: Set<string>; support: number; days: Set<number> }>();

  add(id: string | null | undefined, c: Contribution): void {
    if (!id) return;
    let entry = this.entries.get(id);
    if (!entry) {
      entry = { net: 0, pieces: new Set(), support: 0, days: new Set() };
      this.entries.set(id, entry);
    }
    entry.net += c.value;
    if (c.value > 0) {
      entry.pieces.add(c.slug);
      entry.support += 1;
      entry.days.add(Math.floor(c.at / DAY_MS));
    }
  }

  ranked(label: (id: string) => string): { ranked: FacetEntry[]; negative: string[] } {
    const rows = [...this.entries.entries()];
    const total = rows.reduce((sum, [, e]) => sum + Math.max(0, e.net), 0);
    const ranked = rows
      .filter(([, e]) => e.net > 0.01)
      .map(([id, e]): FacetEntry => ({
        id,
        label: label(id),
        score: e.net,
        share: total > 0 ? e.net / total : 0,
        pieces: e.pieces.size,
        support: e.support,
        days: e.days.size,
      }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const negative = rows.filter(([, e]) => e.net <= SET_ASIDE_BELOW).map(([id]) => id).sort();
    return { ranked, negative };
  }
}

function leader(list: FacetEntry[]): FacetEntry | null {
  const [first, second] = list;
  if (!first || first.support < 2) return null;
  return first.share >= 0.5 || !second || first.score >= second.score * 1.4 ? first : null;
}

function confidenceOf(replayed: Replay, positiveMass: number, positivePieces: number, days: number, explicit: number): InterestConfidence {
  const score = clamp01(
    0.45 * clamp01(positiveMass / 16) +
      0.3 * clamp01(positivePieces / 5) +
      0.15 * clamp01((days - 1) / 3) +
      0.1 * clamp01(explicit / 2),
  );

  let level: ConfidenceLevel;
  if (replayed.usable < 3 || positiveMass < 2) {
    level = 'none';
  } else if (positivePieces < 3 || positiveMass < 6 || score < 0.4 || (days < 2 && explicit === 0)) {
    level = 'low';
  } else if (score < 0.72 || days < 2 || explicit < 1) {
    level = 'medium';
  } else {
    level = 'high';
  }

  const reason =
    level === 'none'
      ? 'Too little to go on.'
      : level === 'low'
        ? 'Only a little activity so far.'
        : level === 'medium'
          ? 'A real pattern, but still forming.'
          : 'Consistent across several visits and kept pieces.';
  return { level, score, reason };
}

function weightedQuantile(sorted: { price: number; weight: number }[], q: number): number {
  const total = sorted.reduce((sum, s) => sum + s.weight, 0);
  let seen = 0;
  for (const s of sorted) {
    seen += s.weight;
    if (seen / total >= q) return s.price;
  }
  return sorted[sorted.length - 1].price;
}

function priceRangeOf(
  pieces: Map<string, PieceEvidence>,
  bySlug: Map<string, InterestCatalogItem>,
  leadingType: FacetEntry | null,
  level: ConfidenceLevel,
  catalog: readonly InterestCatalogItem[],
): PriceRange | null {
  if (level === 'none') return null;
  const positive = [...pieces.entries()]
    .map(([slug, e]) => ({ item: bySlug.get(slug), net: e.net }))
    .filter((p): p is { item: InterestCatalogItem; net: number } => !!p.item && p.net > 0 && p.item.price > 0 && FURNITURE_TYPES.has(p.item.pieceType));

  // Range within the leading kind of piece, so a nightstand and a crib do not
  // average into a band that describes neither.
  const leadingId = leadingType && FURNITURE_TYPES.has(leadingType.id) ? leadingType.id : null;
  const within = leadingId ? positive.filter(p => p.item.pieceType === leadingId) : [];
  const basis = within.length >= 2 ? within : positive;
  if (basis.length < 2) return null;

  const sorted = basis.map(p => ({ price: p.item.price, weight: p.net })).sort((a, b) => a.price - b.price);
  return {
    low: Math.floor(weightedQuantile(sorted, 0.15) / 50) * 50,
    high: Math.ceil(weightedQuantile(sorted, 0.85) / 50) * 50,
    basis: basis === within && leadingId ? pieceTypeLabel(leadingId, catalog) : 'furniture',
    pieces: basis.length,
  };
}

/** Reduces a profile to the only things a summary may say. */
export function summaryFacts(profile: Pick<InterestProfile, 'confidence' | 'leadingStyle' | 'leadingFinishFamily' | 'leadingPieceType' | 'builderLean'>): SummaryFacts {
  const of = (entry: FacetEntry | null) => (entry ? { label: entry.label.toLowerCase(), repeat: entry.days >= 2 } : null);
  return {
    confidence: profile.confidence.level,
    style: of(profile.leadingStyle),
    finishFamily: of(profile.leadingFinishFamily),
    pieceType: of(profile.leadingPieceType),
    builder: profile.builderLean?.label ?? null,
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Plain, hedged by confidence, and never claims repetition it cannot show. */
export function writeRulesSummary(facts: SummaryFacts): string {
  if (facts.confidence === 'none') return 'Not much to go on yet. Look around and this will fill in.';

  const subject =
    facts.style && facts.finishFamily
      ? `${facts.style.label} in ${facts.finishFamily.label}`
      : (facts.style?.label ?? facts.finishFamily?.label ?? null);

  if (facts.confidence === 'low') {
    return subject
      ? `Early days, but ${subject} have had most of your attention so far.`
      : "You've only looked at a few pieces, so we are not reading much into it yet.";
  }

  const headline = subject ?? facts.pieceType?.label ?? null;
  if (!headline) return "You've looked across the range without settling on anything yet.";

  const repeated = (facts.style ?? facts.finishFamily ?? facts.pieceType)?.repeat ?? false;
  const sentence = repeated && facts.confidence === 'high' ? `You keep coming back to ${headline}.` : `You're leaning toward ${headline} so far.`;
  return facts.builder && facts.confidence === 'high' ? `${sentence} ${capitalize(`most of it comes from ${facts.builder}.`)}` : sentence;
}

export interface SynthesizeOptions {
  now?: number;
  /** Replaces the deterministic summary. See SummaryWriter. */
  writer?: SummaryWriter;
}

export function synthesizeProfile(
  events: readonly InterestEvent[],
  catalog: readonly InterestCatalogItem[],
  options: SynthesizeOptions = {},
): InterestProfile {
  const now = options.now ?? Date.now();
  const bySlug = new Map(catalog.map(item => [item.slug, item]));
  const replayed = replay(events, new Set(bySlug.keys()), now);

  const styles = new Facet();
  const families = new Facet();
  const types = new Facet();
  const builders = new Facet();

  for (const c of replayed.contributions) {
    const item = bySlug.get(c.slug);
    if (!item) continue;
    if (!c.finishOnly) {
      styles.add(item.style, c);
      types.add(item.pieceType, c);
      builders.add(item.builderId, c);
    }
    if (c.finish && item.finishes.includes(c.finish)) families.add(finishFamily(c.finish), c);
  }

  const styleLabel = (id: string) => catalog.find(c => c.style === id)?.styleLabel ?? id;
  const styleRank = styles.ranked(styleLabel);
  const familyRank = families.ranked(id => FINISH_FAMILY_LABELS[id as FinishFamily] ?? id);
  const typeRank = types.ranked(id => pieceTypeLabel(id, catalog));
  const builderRank = builders.ranked(id => catalog.find(c => c.builderId === id)?.builderName ?? id);

  const allPieces = [...replayed.pieces.values()];
  const positivePieces = allPieces.filter(p => p.net > 0).length;
  const positiveMass = allPieces.reduce((sum, p) => sum + Math.max(0, p.net), 0);
  const days = new Set(replayed.contributions.filter(c => c.value > 0).map(c => Math.floor(c.at / DAY_MS))).size;
  // Counted after cancellation, so a piece added and then removed earns nothing here.
  const explicit = replayed.contributions.filter(c => c.tier === 'explicit' && c.value > 0).length;
  const confidence = confidenceOf(replayed, positiveMass, positivePieces, days, explicit);

  const speaking = confidence.level !== 'none';
  const leadingStyle = speaking ? leader(styleRank.ranked) : null;
  const leadingFinishFamily = speaking ? leader(familyRank.ranked) : null;
  const leadingPieceType = speaking ? leader(typeRank.ranked) : null;

  /*
   * Judged against the catalogue, not just the other makers. Most pieces here
   * come from one builder, so a raw leader would "lean" toward it for almost
   * every shopper and mean nothing. A lean needs evidence that browsing at random
   * would be unlikely to produce: the chance of every piece seen coming from this
   * maker, given its share of the catalogue, must be under one in ten.
   */
  const builderLean = (() => {
    if (confidence.level === 'none' || confidence.level === 'low') return null;
    const first = builderRank.ranked[0];
    if (!first || first.pieces < 2 || first.share < 0.6) return null;
    const makers = catalog.filter(c => c.builderId);
    const catalogShare = makers.filter(c => c.builderId === first.id).length / Math.max(1, makers.length);
    return catalogShare ** first.pieces < 0.1 ? first : null;
  })();

  const held = [...replayed.pieces.entries()]
    .filter(([, p]) => p.inCart || p.saved || p.sentToBabylist)
    .map(([slug]) => slug);
  const considering = [...replayed.pieces.entries()]
    .filter(([slug, p]) => p.net > 0 && !held.includes(slug))
    .map(([slug]) => slug);

  const partial = {
    confidence,
    leadingStyle,
    leadingFinishFamily,
    leadingPieceType,
    builderLean,
  };

  const writer = options.writer;
  const text = (writer ?? writeRulesSummary)(summaryFacts(partial));

  return {
    version: 1,
    generatedAt: now,
    ...partial,
    styles: styleRank.ranked,
    finishFamilies: familyRank.ranked,
    pieceTypes: typeRank.ranked,
    builders: builderRank.ranked,
    priceRange: priceRangeOf(replayed.pieces, bySlug, leadingPieceType, confidence.level, catalog),
    nursery: nurseryProgress(held, catalog, considering),
    setAside: styleRank.negative.map(styleLabel),
    pieces: Object.fromEntries(replayed.pieces),
    judgedPairs: [...replayed.judgedPairs].sort(),
    activity: {
      events: replayed.usable,
      pieces: positivePieces,
      days,
      byKind: replayed.byKind,
    },
    summary: { text, source: writer ? 'custom' : 'rules' },
  };
}
