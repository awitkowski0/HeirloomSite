/**
 * Display titles for catalogue names that omit the product type.
 *
 * Live Old Town Oak titles already use `<Model> <Type>[ in <Stain>]`
 * (e.g. "Addison Crib in Natural") with the builder only in g:brand /
 * JSON-LD brand. These names follow that pattern. They are not new marketing
 * copy: each description already calls the piece a crib, and the feed
 * already used the type word (it also used to prepend "Fisher ").
 */
export const TYPED_TITLE_NAMES: Readonly<Record<string, string>> = {
  'arched-top': 'Arched Top Crib',
  bloomington: 'Bloomington Crib',
  darlington: 'Darlington Crib',
  hudson: 'Hudson Crib',
  mission: 'Mission Crib',
  moyerton: 'Moyerton Crib',
  princeton: 'Princeton Crib',
};

/**
 * Feed-only wording for Mini Newport (the page title stays the catalogue
 * name). The product's own copy calls it a compact crib.
 */
export const FEED_ONLY_TITLE_NAMES: Readonly<Record<string, string>> = {
  'mini-newport-with-mattress': 'Mini Newport Crib with Mattress',
};

export const FEED_TITLE_NAMES: Readonly<Record<string, string>> = {
  ...TYPED_TITLE_NAMES,
  ...FEED_ONLY_TITLE_NAMES,
};

/** Title/H1/og:title/JSON-LD name: typed name when one exists, else the catalogue name. */
export function productTitleName(slug: string | undefined, fallback: string): string {
  if (!slug) return fallback;
  return TYPED_TITLE_NAMES[slug] ?? fallback;
}
