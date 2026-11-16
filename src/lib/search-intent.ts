/*
 * Reads a plain sentence as catalogue tags, locally, by rule. No model and no
 * network call: every chip below comes from a field in the catalogue, so a word
 * this file does not know is named back to the shopper rather than guessed at.
 *
 * Deliberately pure and free of React. search.ts and the tests share it.
 *
 * Two things this must never do. It must not match a bassinet, because nothing
 * on file is one, so that word is named back. And it must not let a search imply
 * a safety or testing claim: those words are dropped silently, so they neither
 * find anything nor read as a note that the store has nothing of the kind.
 */
import { CRIB_STYLES } from './crib-styles';
import { toneOf, type Tone } from './finish-tones';
import { USE_TAGS } from './uses';

export type TagKind =
  | 'use'
  | 'style'
  | 'top'
  | 'front'
  | 'tone'
  | 'stain'
  | 'category'
  | 'collection'
  | 'builder'
  | 'priceMax'
  | 'priceMin';

export interface QueryTag {
  key: string;
  kind: TagKind;
  label: string;
  value: string | number;
  /** The words of the query this tag came from, so a chip can remove them. */
  source: string;
}

/** One sellable product, aggregated from its finish rows in the search corpus. */
export interface CatalogProduct {
  name: string;
  slug: string;
  category: string;
  uses: string[];
  style: string | null;
  builder: string | null;
  collection: string | null;
  price: number;
  stains: { name: string; image: string; available: boolean; wood: string }[];
}

export interface Vocabulary {
  stains: string[];
  collections: string[];
  builders: { id: string; name: string; patterns: string[] }[];
  /** A single word mapped to the tag it means, for typo correction. */
  words: Map<string, () => QueryTag>;
}

export interface ParsedQuery {
  tags: QueryTag[];
  /** Words left over for free-text matching against names and descriptions. */
  words: string[];
  /** Asked for, but nothing on file is one: named back to the shopper. */
  refused: string[];
}

export interface SuggestedTag {
  tag: QueryTag;
  count: number;
  image: string;
  price: number;
}

export interface SearchOutcome {
  tags: QueryTag[];
  /** Tags that matched nothing together with the rest, so they were relaxed. */
  relaxed: QueryTag[];
  /** Words the catalogue has nothing for, named plainly. */
  unknown: string[];
  /** Words named back to the shopper because nothing on file is one (bassinet). */
  refused: string[];
  products: CatalogProduct[];
  total: number;
  suggestions: SuggestedTag[];
}

/** Named back to the shopper: nothing on file is one. */
const REFUSED: readonly RegExp[] = [/\bbassinets?\b/g];

/*
 * Never used to find anything, and never echoed back: a note saying search can't
 * find "safe" would read as if the store has nothing safe. Patterns only, so the
 * claim words themselves stay out of this source file.
 */
const SILENT: readonly RegExp[] = [
  /\bnon[\s-]?tox\w*\b/g,
  /\btox\w*\b/g,
  /\bnon\b/g,
  /\bformaldehyde\b/g,
  /\bchemical[\s-]?free\b/g,
  /\blead[\s-]?free\b/g,
  /\bcertifi\w*\b/g,
  /\bjp\s?ma\b/g,
  /\bgreen\s?guard\b/g,
  /\bcpsc\b/g,
  /\borganic\b/g,
  /\bsafe(?:st|r|ly)?\b/g,
  /\bsafety\b/g,
  /\btested\b/g,
];

const STOPWORDS = new Set([
  'a', 'an', 'the', 'i', 'we', 'you', 'can', 'could', 'would', 'will', 'on', 'for', 'with', 'that', 'which', 'in', 'into',
  'of', 'to', 'and', 'or', 'me', 'my', 'our', 'us', 'is', 'it', 'are', 'am', 'be', 'at', 'as', 'by', 'from', 'some',
  'something', 'anything', 'piece', 'pieces', 'item', 'items', 'furniture', 'baby', 'kid', 'kids', 'child', 'nursery',
  'room', 'looking', 'look', 'want', 'need', 'show', 'find', 'get', 'have', 'has', 'also', 'very', 'really', 'please',
  'just', 'like', 'one', 'ones', 'there', 'do', 'does', 'turn', 'turns', 'help', 'kind', 'type', 'style', 'made', 'make',
  'buy', 'color', 'colour', 'finish', 'stain', 'wood', 'wooden',
]);

const USE_LABEL: Record<string, string> = Object.fromEntries(USE_TAGS.map(u => [u.tag, u.tag.charAt(0) + u.tag.slice(1).toLowerCase()]));

function tagOfUse(value: string, source: string): QueryTag {
  return { key: `use:${value}`, kind: 'use', label: USE_LABEL[value] ?? value, value, source };
}
function styleTag(id: (typeof CRIB_STYLES)[number]['id'], source: string): QueryTag {
  const style = CRIB_STYLES.find(s => s.id === id);
  return { key: `style:${id}`, kind: 'style', label: style?.label ?? id, value: id, source };
}
function topTag(value: 'flat' | 'arched', source: string): QueryTag {
  return { key: `top:${value}`, kind: 'top', label: value === 'flat' ? 'Flat top' : 'Arched top', value, source };
}
function frontTag(value: 'slats' | 'panel', source: string): QueryTag {
  return { key: `front:${value}`, kind: 'front', label: value === 'slats' ? 'Slats' : 'Panel', value, source };
}
function toneTag(value: 'light' | 'dark' | 'mid', source: string): QueryTag {
  return { key: `tone:${value}`, kind: 'tone', label: `${value[0].toUpperCase()}${value.slice(1)} finish`, value, source };
}
function categoryTag(value: string, source: string): QueryTag {
  return { key: `category:${value}`, kind: 'category', label: value, value, source };
}
function moneyLabel(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}
export function priceMaxTag(value: number, source: string): QueryTag {
  return { key: 'priceMax', kind: 'priceMax', label: `Under ${moneyLabel(value)}`, value, source };
}
function priceMinTag(value: number, source: string): QueryTag {
  return { key: 'priceMin', kind: 'priceMin', label: `Over ${moneyLabel(value)}`, value, source };
}

function moneyOf(num: string, thousands: string | undefined): number {
  const n = Number(num.replace(/,/g, ''));
  return thousands ? n * 1000 : n;
}

/** Longest first, so "full bed" wins before "bed", and "arched slat" before "arched". */
type Rule = { re: RegExp; build: (source: string, m: RegExpExecArray) => QueryTag };
const PHRASE_RULES: readonly Rule[] = [
  { re: /\b(?:turns?\s+into|converts?\s+(?:in)?to|conversion\s+to|grows?\s+into)(?:\s+a)?\s+full(?:[\s-]?size)?\s+bed\b/g, build: s => tagOfUse('FULL BED', s) },
  { re: /\b(?:turns?\s+into|converts?\s+(?:in)?to|conversion\s+to|grows?\s+into)(?:\s+a)?\s+toddler\s+bed\b/g, build: s => tagOfUse('TODDLER BED', s) },
  { re: /\bfull(?:[\s-]?size)?\s+beds?\b/g, build: s => tagOfUse('FULL BED', s) },
  { re: /\btoddler\s+beds?\b/g, build: s => tagOfUse('TODDLER BED', s) },
  { re: /\bday\s?beds?\b/g, build: s => tagOfUse('DAY BED', s) },
  { re: /\b(?:change|changing)\s+(?:a\s+)?(?:baby|diapers?|nappy)\b|\bchanging\s+(?:table|top|station|tray)s?\b|\bdiapers?\b/g, build: s => tagOfUse('CHANGING TABLE', s) },
  { re: /\bsmall(?:er)?\s+(?:nursery|nurseries|room|space|spaces|crib|cribs)\b|\bcompact\b|\bmini\b|\btiny\b/g, build: s => tagOfUse('MINI', s) },
  { re: /\barch(?:ed)?[\s-]+slats?\b/g, build: s => styleTag('arched-slats', s) },
  { re: /\barch(?:ed)?[\s-]+panels?\b/g, build: s => styleTag('arched-panel', s) },
  { re: /\bsolid[\s-]+panels?\b/g, build: s => styleTag('solid-panel', s) },
  { re: /\bclassic[\s-]+slats?\b/g, build: s => styleTag('classic-slats', s) },
  { re: /\b(?:flat|straight)[\s-]+tops?\b/g, build: s => topTag('flat', s) },
  { re: /\b(?:arch(?:ed)?|curved?|rounded?)(?:\s+top)?\b/g, build: s => topTag('arched', s) },
  { re: /\bslat(?:s|ted)?\b/g, build: s => frontTag('slats', s) },
  { re: /\bpanels?\b/g, build: s => frontTag('panel', s) },
  { re: /\bconvert(?:s|ible|ing)?\b|\bgrows?\b/g, build: s => tagOfUse('TODDLER BED', s) },
  { re: /\bcribs?\b/g, build: s => tagOfUse('CRIB', s) },
  { re: /\bdressers?\b/g, build: s => tagOfUse('DRESSER', s) },
  { re: /\bhutch(?:es)?\b/g, build: s => tagOfUse('HUTCH', s) },
  { re: /\bmirrors?\b/g, build: s => tagOfUse('MIRROR', s) },
  { re: /\bnight\s?stands?\b/g, build: s => categoryTag('Nightstands', s) },
  { re: /\bchests?\b/g, build: s => categoryTag('Chests', s) },
];

const PRICE_RULES: readonly Rule[] = [
  { re: /\b(?:under|below|less\s+than|up\s+to|at\s+most|max(?:imum)?)\s+\$?\s*(\d[\d,]*)\s*(k)?\b/g, build: (s, m) => priceMaxTag(moneyOf(m[1], m[2]), s) },
  { re: /\$?\s*(\d[\d,]*)\s*(k)?\s+(?:or\s+less|and\s+under|or\s+under|max)\b/g, build: (s, m) => priceMaxTag(moneyOf(m[1], m[2]), s) },
  { re: /\b(?:over|above|more\s+than)\s+\$?\s*(\d[\d,]*)\s*(k)?\b/g, build: (s, m) => priceMinTag(moneyOf(m[1], m[2]), s) },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildVocabulary(
  products: readonly CatalogProduct[],
  builderRecords: readonly { id: string; name: string }[],
): Vocabulary {
  const stains = [...new Set(products.flatMap(p => p.stains.map(s => s.name)))].filter(
    n => n && n.toLowerCase() !== 'default',
  );
  const collections = [...new Set(products.map(p => p.collection).filter((c): c is string => Boolean(c)))];
  const builders = builderRecords.map(b => {
    const short = b.name.replace(/\s+Quality Products$/i, '').replace(/\s+Comfort$/i, ' Comfort');
    const patterns = new Set([b.name, short]);
    if (/fisher/i.test(b.name)) ['fisher', 'fishers', "fisher's", 'fisher’s'].forEach(p => patterns.add(p));
    if (/old town oak/i.test(b.name)) patterns.add('oto');
    return { id: b.id, name: short, patterns: [...patterns] };
  });

  const words = new Map<string, () => QueryTag>();
  for (const use of USE_TAGS) {
    const single = use.tag.toLowerCase();
    if (!single.includes(' ')) words.set(single, () => tagOfUse(use.tag, single));
  }
  words.set('nightstand', () => categoryTag('Nightstands', 'nightstand'));
  words.set('chest', () => categoryTag('Chests', 'chest'));
  words.set('slats', () => frontTag('slats', 'slats'));
  for (const stain of stains) {
    const lower = stain.toLowerCase();
    if (!lower.includes(' ')) words.set(lower, () => stainTag(stain, lower));
  }
  for (const c of collections) {
    if (!c.includes(' ')) words.set(c.toLowerCase(), () => collectionTag(c, c.toLowerCase()));
  }
  return { stains, collections, builders, words };
}

function stainTag(name: string, source: string): QueryTag {
  return { key: `stain:${name}`, kind: 'stain', label: name, value: name, source };
}
function collectionTag(name: string, source: string): QueryTag {
  return { key: `collection:${name}`, kind: 'collection', label: name, value: name, source };
}
function builderTag(id: string, name: string, source: string): QueryTag {
  return { key: `builder:${id}`, kind: 'builder', label: name, value: id, source };
}

function dedupe(tags: QueryTag[]): QueryTag[] {
  const seen = new Set<string>();
  return tags.filter(t => (seen.has(t.key) ? false : (seen.add(t.key), true)));
}

/** Edit distance, capped: this only ever needs to see 0, 1 or 2. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, row[j - 1], row[j]) + 1;
      prev = temp;
    }
  }
  return row[b.length];
}

/** The tag word a typo is closest to, or null when nothing is near enough. */
function correctWord(word: string, words: Vocabulary['words']): QueryTag | null {
  if (word.length < 4) return null;
  const limit = word.length >= 7 ? 2 : 1;
  let best: { tag: () => QueryTag; dist: number; word: string } | null = null;
  for (const [known, tag] of words) {
    if (known === word) return tag();
    const dist = editDistance(word, known);
    if (dist <= limit && (!best || dist < best.dist)) best = { tag, dist, word: known };
  }
  return best ? { ...best.tag(), source: word } : null;
}

function normalise(raw: string): string {
  return raw.toLowerCase().replace(/[“”"]/g, ' ').replace(/[^a-z0-9$,'’\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Read a query into tags. Pure: the same text always gives the same tags. */
export function parseQuery(raw: string, vocab: Vocabulary): ParsedQuery {
  let text = normalise(raw);
  const tags: QueryTag[] = [];
  const refused: string[] = [];

  for (const re of REFUSED) {
    re.lastIndex = 0;
    const found = text.match(re);
    if (found) {
      refused.push(found[0]);
      text = text.replace(re, ' ');
    }
  }
  for (const re of SILENT) text = text.replace(re, ' ');

  const take = (re: RegExp, build: (source: string, m: RegExpExecArray) => QueryTag | null) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    let next = '';
    let cursor = 0;
    while ((m = re.exec(text))) {
      const tag = build(m[0].trim(), m);
      if (tag) tags.push(tag);
      next += `${text.slice(cursor, m.index)} `;
      cursor = m.index + m[0].length;
    }
    if (cursor > 0) text = `${next}${text.slice(cursor)}`;
  };

  for (const rule of PRICE_RULES) take(new RegExp(rule.re.source, 'g'), rule.build);
  for (const stain of [...vocab.stains].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${escapeRegExp(stain.toLowerCase())}\\b`, 'g');
    take(re, s => stainTag(stain, s));
  }
  // A two-word collection ("French Country") before its words are read singly.
  for (const c of vocab.collections.filter(n => n.includes(' '))) {
    const re = new RegExp(`\\b${escapeRegExp(c.toLowerCase())}\\b`, 'g');
    take(re, s => collectionTag(c, s));
  }
  for (const b of vocab.builders) {
    for (const pattern of [...b.patterns].sort((x, y) => y.length - x.length)) {
      const re = new RegExp(`(?<![a-z])${escapeRegExp(pattern.toLowerCase())}(?![a-z])`, 'g');
      take(re, s => builderTag(b.id, b.name, s));
    }
  }
  for (const c of vocab.collections.filter(n => !n.includes(' '))) {
    const re = new RegExp(`\\b${escapeRegExp(c.toLowerCase())}\\b`, 'g');
    take(re, s => collectionTag(c, s));
  }
  for (const rule of PHRASE_RULES) take(new RegExp(rule.re.source, 'g'), rule.build);
  take(/\b(dark|deep)\b/g, s => toneTag('dark', s));
  take(/\b(light|pale|blond|blonde)\b/g, s => toneTag('light', s));
  take(/\b(mid|medium)\b/g, s => toneTag('mid', s));

  const words: string[] = [];
  for (const token of text.replace(/[,$]/g, ' ').split(/\s+/).filter(Boolean)) {
    if (STOPWORDS.has(token)) continue;
    if (/^\d+$/.test(token)) continue;
    const corrected = correctWord(token, vocab.words);
    if (corrected) tags.push(corrected);
    else words.push(token);
  }

  return { tags: dedupe(tags), words, refused };
}

const STYLE_BY_ID: Record<string, (typeof CRIB_STYLES)[number]> = Object.fromEntries(CRIB_STYLES.map(s => [s.id, s]));

function matchesTag(product: CatalogProduct, tag: QueryTag): boolean {
  switch (tag.kind) {
    case 'use':
      return product.uses.includes(String(tag.value));
    case 'style':
      return product.style === tag.value;
    case 'top': {
      const style = product.style ? STYLE_BY_ID[product.style] : undefined;
      return style?.top.toLowerCase() === tag.value;
    }
    case 'front': {
      const style = product.style ? STYLE_BY_ID[product.style] : undefined;
      return style ? (style.front === 'Slatted' ? 'slats' : 'panel') === tag.value : false;
    }
    case 'tone':
      return product.stains.some(s => s.available && toneOf(s.name) === (tag.value as Tone));
    case 'stain':
      return product.stains.some(s => s.available && s.name === tag.value);
    case 'category':
      return product.category === tag.value;
    case 'collection':
      return product.collection === tag.value;
    case 'builder':
      return product.builder === tag.value;
    case 'priceMax':
      return product.price <= Number(tag.value);
    case 'priceMin':
      return product.price >= Number(tag.value);
  }
}

export function applyTags(products: readonly CatalogProduct[], tags: readonly QueryTag[]): CatalogProduct[] {
  return products.filter(p => tags.every(t => matchesTag(p, t)));
}

/** The tags a shopper can add from here, with a photo and from-price for each. */
export function suggestTags(
  matching: readonly CatalogProduct[],
  active: readonly QueryTag[],
  vocab: Vocabulary,
  limit = 3,
): SuggestedTag[] {
  const candidates: QueryTag[] = [
    ...USE_TAGS.filter(u => u.tag !== 'MIRROR').map(u => tagOfUse(u.tag, u.tag.toLowerCase())),
    ...CRIB_STYLES.map(s => styleTag(s.id, s.label.toLowerCase())),
    toneTag('light', 'light'),
    toneTag('dark', 'dark'),
    ...vocab.builders.map(b => builderTag(b.id, b.name, b.patterns[0].toLowerCase())),
    ...vocab.collections.map(c => collectionTag(c, c.toLowerCase())),
  ];
  const activeKeys = new Set(active.map(t => t.key));
  const scored = candidates.flatMap(tag => {
    if (activeKeys.has(tag.key)) return [];
    const hits = matching.filter(p => matchesTag(p, tag));
    if (hits.length === 0 || hits.length === matching.length) return [];
    const photo = hits[0].stains.find(s => s.available && s.image)?.image ?? '';
    return [{ tag, count: hits.length, image: photo, price: Math.min(...hits.map(p => p.price)) }];
  });
  // A varied set rather than three builders in a row: at most one per kind.
  const seenKinds = new Set<TagKind>();
  return scored
    .sort((a, b) => b.count - a.count)
    .filter(s => (seenKinds.has(s.tag.kind) ? false : (seenKinds.add(s.tag.kind), true)))
    .slice(0, limit);
}

/** Take a chip's own words out of the query. */
export function removeTagFromQuery(query: string, tag: QueryTag): string {
  const pattern = tag.source.trim().replace(/\s+/g, '\\s+');
  const next = query.replace(new RegExp(`\\b${pattern}\\b`, 'i'), ' ');
  const removed = next === query ? query.replace(new RegExp(escapeRegExp(tag.source), 'i'), ' ') : next;
  return removed.replace(/\s+/g, ' ').trim();
}

/** Ask for a tag by adding its words to the query. */
export function addTagToQuery(query: string, tag: QueryTag): string {
  return `${query.trim()} ${tag.source}`.trim();
}
