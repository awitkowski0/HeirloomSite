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
export function variantLabel(wood: string, stainName: string): string {
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
