/*
 * The catalogue search, without React: one MiniSearch index for free text and
 * one aggregated product list for tag filtering. search.ts wraps it in hooks
 * and the tests drive it directly against the same generated documents.
 */
import MiniSearch from 'minisearch';
import { photoRank } from './photo-notes';
import {
  applyTags,
  buildVocabulary,
  parseQuery,
  suggestTags,
  type CatalogProduct,
  type QueryTag,
  type SearchOutcome,
  type Vocabulary,
} from './search-intent';
import { isUnlistedCategory } from './taxonomy';

export interface SearchDoc {
  id: string;
  productName: string;
  slug: string | null;
  wood: string;
  category: string;
  stainNames: string;
  unavailableStains: string[];
  description: string;
  basePrice: number;
  stainImages: Record<string, string>;
  uses: string[];
  style: string | null;
  builder: string | null;
  collection: string | null;
}

function createIndex() {
  return new MiniSearch<SearchDoc>({
    fields: ['productName', 'wood', 'category', 'stainNames', 'description'],
    storeFields: ['productName', 'slug', 'wood', 'category', 'basePrice', 'stainImages', 'stainNames', 'unavailableStains'],
    searchOptions: {
      boost: { productName: 3, wood: 2, stainNames: 2, category: 2, description: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
}

/** Group finish rows into one row per product, keeping the lowest listed price. */
export function toCatalog(docs: readonly SearchDoc[]): CatalogProduct[] {
  const byName = new Map<string, CatalogProduct>();
  for (const doc of docs) {
    if (!doc.slug) continue;
    let product = byName.get(doc.productName);
    if (!product) {
      product = {
        name: doc.productName,
        slug: doc.slug,
        category: doc.category,
        uses: doc.uses ?? [],
        style: doc.style ?? null,
        builder: doc.builder ?? null,
        collection: doc.collection ?? null,
        price: doc.basePrice,
        stains: [],
      };
      byName.set(doc.productName, product);
    }
    product.price = Math.min(product.price, doc.basePrice);
    for (const [name, image] of Object.entries(doc.stainImages ?? {})) {
      if (product.stains.some(s => s.name === name)) continue;
      product.stains.push({
        name,
        image,
        wood: doc.wood,
        available: !(doc.unavailableStains ?? []).includes(name),
      });
    }
  }
  return [...byName.values()];
}

export interface SearchEngine {
  index: MiniSearch<SearchDoc>;
  vocab: Vocabulary;
  catalog: CatalogProduct[];
  /** Everything a shopper can be shown: excludes the unlisted categories. */
  listed: CatalogProduct[];
  search: (query: string, options?: { limit?: number; exclude?: (slug: string) => boolean }) => SearchOutcome;
  /** The starter tags offered before anything is typed. */
  starters: (exclude?: (slug: string) => boolean) => SearchOutcome['suggestions'];
}

export function createSearchEngine(docs: readonly SearchDoc[], builders: readonly { id: string; name: string }[]): SearchEngine {
  const index = createIndex();
  index.addAll(docs as SearchDoc[]);
  const catalog = toCatalog(docs);
  const listed = catalog.filter(p => !isUnlistedCategory(p.category));
  const vocab = buildVocabulary(listed, builders);

  const visible = (exclude?: (slug: string) => boolean) => (exclude ? listed.filter(p => !exclude(p.slug)) : listed);

  const ranked = (products: CatalogProduct[]) =>
    [...products].sort((a, b) => photoRank(a.slug) - photoRank(b.slug));

  function freeTextScores(words: readonly string[], pool: readonly CatalogProduct[]) {
    const names = new Set(pool.map(p => p.name));
    const scores = new Map<string, number>();
    const understood: string[] = [];
    const unknown: string[] = [];
    for (const word of words) {
      const hits = index.search(word, { prefix: true, fuzzy: 0.2 }).filter(h => names.has((h as unknown as SearchDoc).productName));
      if (hits.length === 0) {
        unknown.push(word);
        continue;
      }
      understood.push(word);
      for (const hit of hits) {
        const name = (hit as unknown as SearchDoc).productName;
        scores.set(name, (scores.get(name) ?? 0) + hit.score);
      }
    }
    return { scores, understood, unknown };
  }

  return {
    index,
    vocab,
    catalog,
    listed,
    starters: exclude => {
      const pool = visible(exclude);
      return suggestTags(pool, [], vocab, 6);
    },
    search: (query, { limit, exclude } = {}) => {
      const parsed = parseQuery(query, vocab);
      const pool = visible(exclude);

      // Relax from the last tag backward until something matches: never a dead end.
      const relaxed: QueryTag[] = [];
      const active = [...parsed.tags];
      let candidates = applyTags(pool, active);
      while (candidates.length === 0 && active.length > 0) {
        relaxed.unshift(active.pop() as QueryTag);
        candidates = applyTags(pool, active);
      }

      const { scores, understood, unknown } = freeTextScores(parsed.words, pool);
      const unmatched = [...unknown];
      if (understood.length > 0) {
        const narrowed = candidates.filter(p => scores.has(p.name));
        if (narrowed.length > 0) {
          candidates = narrowed;
        } else {
          // The words mean something on their own, but not alongside these tags.
          unmatched.push(...understood);
        }
      }
      if (candidates.length === 0) candidates = pool;

      const sorted =
        understood.length > 0 && scores.size > 0
          ? [...candidates].sort((a, b) => (scores.get(b.name) ?? 0) - (scores.get(a.name) ?? 0))
          : ranked(candidates);
      const total = sorted.length;
      return {
        tags: active,
        relaxed,
        unknown: unmatched,
        refused: parsed.refused,
        products: limit ? sorted.slice(0, limit) : sorted,
        total,
        suggestions: suggestTags(sorted, active, vocab),
      };
    },
  };
}
