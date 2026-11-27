/*
 * Rules a product must meet that are not about its photographs.
 *
 * Shared by scripts/build-data.mjs (which refuses to build on them) and
 * scripts/product.mjs (`check` and `publish`), so the CLI reports the same
 * thing the build will, in the same words. The photo rules live next door in
 * product-page.mjs.
 */

/**
 * `variantType` declares what the `variant` field MEANS for a product, because
 * one field carries different things across the catalogue: a wood species
 * ("BrownMaple"), a rug size ('5\'7" x 7\'10"'), a finish ("Asbury-Brown"), or
 * nothing at all ("Default Title", a Shopify export artifact).
 *
 * A declaration that can drift from the data is worth little, so it is checked
 * against the actual variant names.
 */
const WOOD_SPECIES = new Set(["brownmaple", "cherrywood", "redoak"]);
export const VARIANT_TYPES = new Set(["wood", "size", "finish", "none"]);

export function inferVariantType(names) {
  if (names.length === 1 && names[0] === "Default Title") return "none";
  if (names.every(n => WOOD_SPECIES.has(n.toLowerCase().replace(/\s/g, "")))) return "wood";
  if (names.every(n => n.includes('"') || /\d'/.test(n))) return "size";
  return "finish";
}

/** The one thing wrong with a product's variantType, or null. */
export function variantTypeProblem(dirName, declared, names) {
  if (!declared) return `${dirName}: product.json has no variantType`;
  if (!VARIANT_TYPES.has(declared)) {
    return `${dirName}: variantType "${declared}" is not one of ${[...VARIANT_TYPES].join(", ")}`;
  }
  // A composite "BrownMaple / Antique Slate" is the specific corruption this
  // guard exists to keep out: it reads as a finish but hides a wood.
  const composite = names.filter(n => n.includes(" / "));
  if (composite.length > 0) {
    return `${dirName}: variant names still encode wood AND finish (${composite[0]}); split them`;
  }
  const inferred = inferVariantType(names);
  if (inferred !== declared) {
    return `${dirName}: variantType is "${declared}" but the variant names look like "${inferred}" (${names.slice(0, 2).join(", ")})`;
  }
  return null;
}

/**
 * What a template leaves for a person to fill in.
 *
 * Templates (templates/products/) and `new --like` write the word TODO where
 * copy or a SKU belongs, and a price of 0. A draft may carry these for as long
 * as it likes - it is not built for production. A product that is NOT a draft
 * may not: the build refuses it, because the alternative is a live page that
 * says "TODO" or sells a crib for $0.
 */
const PLACEHOLDER = /\bTODO\b/;

export function placeholderProblems(meta, variants) {
  const problems = [];
  const walk = (value, path) => {
    if (typeof value === "string") {
      if (PLACEHOLDER.test(value)) problems.push(`product.json: "${path}" is still a placeholder (${JSON.stringify(value.slice(0, 40))})`);
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(meta, "");

  for (const v of variants || []) {
    if (v.hidden === true) continue;
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === "string" && PLACEHOLDER.test(val)) {
        problems.push(`variants.json: ${v.variant || "(unnamed variant)"} "${k}" is still a placeholder`);
      }
    }
    if (!(Number(v.basePrice) > 0)) {
      problems.push(`variants.json: ${v.variant || "(unnamed variant)"} has no price (basePrice, whole dollars)`);
    }
  }
  return problems;
}
