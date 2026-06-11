import MiniSearch from 'minisearch';
import { useContent } from '../useContent';

export interface SearchResult {
  id: string;
  productName: string;
  slug: string;
  wood: string;
  category: string;
  basePrice: number;
  image: string;
  matchedStain?: string;
}

function buildDocs(inventory: any[]) {
  const seen = new Set<string>();
  return inventory.flatMap(item => {
    const key = `${item.productName}||${item.wood}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const stainNames = item.stains.map((s: any) => s.name).join(' ');
    const stainImages: Record<string, string> = {};
    for (const s of item.stains) {
      stainImages[s.name] = s.image || '';
    }
    return {
      id: `${item.productName}||${item.wood}`,
      productName: item.productName,
      slug: item.slug || '',
      wood: item.wood,
      category: item.category || '',
      stainNames,
      stainImages,
      description: item.description || '',
      basePrice: item.basePrice,
    };
  });
}

function createSearch() {
  return new MiniSearch({
    fields: ['productName', 'wood', 'category', 'stainNames', 'description'],
    storeFields: ['productName', 'slug', 'wood', 'category', 'basePrice', 'stainImages'],
    searchOptions: {
      boost: { productName: 3, wood: 2, stainNames: 2, category: 2, description: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
}

// ⚡ Bolt Optimization: Cache the MiniSearch index globally.
// Previously, the entire index was recreated on every search stroke, causing
// unnecessary CPU load and blocking the main thread. Now we reuse it.
let cachedIndex: MiniSearch | null = null;
let cachedInventory: any[] | null = null;

function getSearchIndex(inventory: any[]) {
  // If the inventory hasn't changed reference, return the existing index.
  if (cachedIndex && cachedInventory === inventory) {
    return cachedIndex;
  }
  const ms = createSearch();
  ms.addAll(buildDocs(inventory));
  cachedIndex = ms;
  cachedInventory = inventory;
  return ms;
}

export function useSearch(query: string): SearchResult[] {
  const { inventory, loading } = useContent();

  if (loading || !query.trim()) return [];

  try {
    const ms = getSearchIndex(inventory);
    const raw = ms.search(query, { prefix: true, fuzzy: 0.2 });
    const results: SearchResult[] = [];
    const seen = new Set<string>();

    for (const hit of raw) {
      const doc = hit as any;
      const key = `${doc.productName}||${doc.wood}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const queryWords = query.toLowerCase().split(/\s+/);
      const matchedStain = doc.stainNames
        ? queryWords.find((w: string) =>
            doc.stainNames.toLowerCase().split(' ').some((s: string) => s.includes(w) || w.includes(s))
          )
        : undefined;

      const firstStain = Object.keys(doc.stainImages || {})[0] || '';
      const image = matchedStain && doc.stainImages?.[matchedStain]
        ? doc.stainImages[matchedStain]
        : doc.stainImages?.[firstStain] || '';

      results.push({
        id: doc.id,
        productName: doc.productName,
        slug: doc.slug || '',
        wood: doc.wood,
        category: doc.category,
        basePrice: doc.basePrice,
        image,
        matchedStain: matchedStain || undefined,
      });

      if (results.length >= 8) break;
    }
    return results;
  } catch {
    return [];
  }
}

export function searchProducts(query: string, inventory: any[]): any[] {
  if (!query.trim()) return inventory;
  const ms = getSearchIndex(inventory);
  const hits = ms.search(query, { prefix: true, fuzzy: 0.2 });
  const matched = new Set(hits.map((h: any) => h.id));
  return inventory.filter((item: any) => matched.has(`${item.productName}||${item.wood}`));
}
