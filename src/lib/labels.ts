export { stainLabel } from './stainColors';
import { stainLabel } from './stainColors';

/**
 * Human-readable variant name.
 *
 * Splits camelCase only at a lower->upper boundary. The previous
 * `replace(/([A-Z])/g, ' $1')` inserted a space before EVERY capital, including
 * ones already preceded by a space or a hyphen, which mangled real catalogue
 * values:
 *
 *   "Default Title"              -> "Default  Title"        (double space)
 *   "Asbury-Brown"               -> "Asbury- Brown"         (broken hyphen)
 *   "BrownMaple / Antique Slate" -> "Brown Maple /  Antique  Slate"
 *
 * while still producing "Brown Maple", "Cherry Wood" and "Red Oak".
 */
export function humanizeWood(wood: string): string {
  return wood.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
}

/**
 * The wood/stain pair as it should read to a customer.
 *
 * 212 of the 273 inventory rows carry a stain whose name is identical to the
 * variant name (the catalogue encodes some variants as a single
 * "Wood / Stain" string), so rendering both produced lines like
 * "Natural • Natural" and "Brown Maple / Antique Slate • Antique Slate".
 * Returns one label when the second adds nothing.
 */
/*
 * The placeholder a single-variant product carries.
 *
 * "Default Title" is a Shopify export artifact, not a choice anyone made -
 * src/lib/variants.ts already refuses to emit it as a URL segment for the same
 * reason. It reached customers anyway: variantLabel returned it verbatim,
 * because "defaulttitle" contains "default" and the duplicate-collapsing
 * branch treats that as the pair saying one thing. It does say one thing. The
 * thing it says is nothing, so the cart read "Addison Chest Dresser — Default
 * Title" on all 43 products that have no variant to choose.
 */
const NO_VARIANT = new Set(['default title', 'default', 'default title / default']);

function isPlaceholder(value: string): boolean {
  return NO_VARIANT.has(value.trim().toLowerCase());
}

/**
 * Empty when the product has no variant worth naming. Callers must handle
 * that rather than printing a separator around it.
 */
export function variantLabel(wood: string, stainName: string): string {
  if (isPlaceholder(wood) && isPlaceholder(stainName)) return '';

  const woodText = humanizeWood(wood);
  const stainText = stainLabel(stainName);

  if (!stainText) return woodText;
  if (!woodText) return stainText;

  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const w = normalise(woodText);
  const s = normalise(stainText);

  // Identical, or the stain is already spelled out inside the variant name
  // (e.g. wood "BrownMaple / Antique Slate", stain "Antique Slate"; or wood
  // "Default Title", stain "Default"). Checked against the full catalogue:
  // all 12 containment matches are genuine duplicates, none is a distinct
  // stain being wrongly hidden.
  if (w === s || w.includes(s)) return woodText;

  return `${woodText} • ${stainText}`;
}
