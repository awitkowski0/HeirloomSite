/**
 * Swatch colours for stain/finish names.
 *
 * This replaces three divergent copies of the same table (utils/stainColors.ts
 * with 23 keys, StainSelector with 15, StainStripMobile with 12) that had two
 * different fallbacks, so the same stain rendered as three different colours on
 * three surfaces.
 *
 * Beyond deduplication, the old lookup had two real defects:
 *
 * 1. It returned the FIRST key whose text appeared anywhere in the name, so the
 *    result depended on JS object insertion order. 13 of the 64 stain names in
 *    the catalogue match more than one key.
 * 2. Many names are composite "Wood / Stain" strings ("BrownMaple / Driftwood").
 *    Matching the whole string let the wood win over the actual finish, so the
 *    swatch showed maple for a driftwood stain.
 *
 * Fixes: match only the finish segment, and prefer the longest matching key.
 */

const SWATCH_COLORS: Record<string, string> = {
  // Woods
  maple: '#DEB887',
  oak: '#B89B72',
  cherry: '#651c14',
  walnut: '#5C4033',
  mahogany: '#4A2C2A',

  // Stains and finishes
  natural: '#DEB887',
  slate: '#5A6064',
  'antique slate': '#6B7176',
  antique: '#8B7355',
  smoke: '#3b3c36',
  driftwood: '#a39887',
  ebony: '#3B3B3B',
  espresso: '#2C1E16',
  frost: '#E8E4DF',
  fruitwood: '#C4A265',
  harvest: '#9B7B3E',
  provincial: '#8B6F47',
  seely: '#C4956A',
  washington: '#A0928B',
  mx: '#9B8B7A',
  white: '#F5F5F0',
  grey: '#8C8C8C',
  gray: '#8C8C8C',
  black: '#2D2D2D',

  // Painted finishes that previously matched nothing and fell back to brown.
  almond: '#EFDECD',
  carbon: '#4A4A4A',
  earthtone: '#9C8570',
  sandstone: '#C9B79C',
  manchester: '#8A8F87',
  'asbury-brown': '#6B5344',
  'michaels-cherry': '#7B2E20',
  'candlenut white': '#F2EDE4',
  'hackles black': '#26262A',
  'pomona red': '#9E3B32',
  'selvedge blue': '#4A6076',
  'setting plaster pink': '#E4C3B4',
  'pleasure garden green': '#6E7A5A',
  default: '#B89B72',
};

// Longest first, so "antique slate" beats "slate" and "fruitwood" beats "wood".
const KEYS_BY_LENGTH = Object.keys(SWATCH_COLORS).sort((a, b) => b.length - a.length);

const FALLBACK = '#8B7355';

/**
 * Names like `2'7" x 8'2"` are rug dimensions, not finishes. The variant
 * selector is reused for sizes on those products, and painting a wood-coloured
 * swatch for a size is meaningless -- callers should render a text chip instead.
 */
export function isDimensionName(name: string): boolean {
  return /\d\s*(?:'|")|\bx\b/i.test(name) && /['"]/.test(name);
}

/**
 * The finish part of a "Wood / Stain" name.
 *
 * No catalogue name is composite any more - those variants were split - but the
 * swatch table is keyed on finish words, so reducing to the last segment stays
 * the correct read for any name that does arrive with a wood prefix.
 */
function finishSegment(name: string): string {
  const parts = name.split('/');
  return (parts[parts.length - 1] || name).trim().toLowerCase();
}

/**
 * Swatch colour for a stain name, or null when the name is not a colour at all
 * (rug dimensions). Callers must handle null rather than painting a fake swatch.
 */
export function getStainColor(name: string): string | null {
  if (!name) return null;
  if (isDimensionName(name)) return null;

  const finish = finishSegment(name);
  for (const key of KEYS_BY_LENGTH) {
    if (finish.includes(key)) return SWATCH_COLORS[key];
  }

  // Fall back to scanning the whole name, in case the finish segment was empty.
  const whole = name.toLowerCase();
  for (const key of KEYS_BY_LENGTH) {
    if (whole.includes(key)) return SWATCH_COLORS[key];
  }
  return FALLBACK;
}

/**
 * Display label: drops a redundant wood prefix from a "Wood / Stain" name.
 *
 * Inert against the current catalogue, which has no composite names left. Kept
 * as a display-layer guard so a re-import that reintroduces them renders a
 * finish rather than "BrownMaple / Driftwood".
 */
export function stainLabel(name: string): string {
  const parts = name.split('/');
  if (parts.length < 2) return name;
  return parts[parts.length - 1].trim() || name;
}
