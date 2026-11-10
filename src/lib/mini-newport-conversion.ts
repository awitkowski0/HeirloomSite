import {
  isConversionPiece,
  isConvertibleProduct,
  type ConversionCatalogFields,
} from '@/lib/conversion';

/**
 * Mini Newport (OTO-1380) Twin Bed Conversion Kit (OTO-1380B).
 *
 * Price-book evidence (does not set retail): merchant/checks/2026-11-02-issue52-facts/oto-pricebook-excerpt.txt
 * line 60, "Mini Newport Collection" / "1380-B Twin Bed Conversion". Brown Maple unfinished
 * is $155 and estimated finishing is $49. That cost is not the retail price.
 *
 * TWIN_BED_CONVERSION_PRICE is the sell price: $368 (Phil via CoS and
 * Director, 10:48 AM ET). The price-book cost $155 + $49 = $204 is not
 * the retail. OTO-401B Full Bed Rail Kit stays at $481. Keep variants.json
 * in sync — the test checks they match.
 *
 * Customer-facing name is "Twin Bed Conversion Kit" (Director). Brand copy
 * (signed file sha256 5850186a0c36b225e36e0f211ea70ff40ec13f47951bb44b5ddd82b3b45a9446,
 * MINI-NEWPORT-TWIN-COPY-2026-11-10.md): part (a) is the add-on label and line;
 * part (b) is the 2-stage note. Use those strings exactly. No daybed stage and
 * no 4-in-1 claim for the Mini.
 */

export const TWIN_BED_CONVERSION_SKU = 'OTO-1380B';
export const TWIN_BED_CONVERSION_SLUG = 'mini-newport-twin-bed-conversion';
/** Customer-facing product name: add-on (stem), variant, feed title. */
export const TWIN_BED_CONVERSION_NAME = 'Twin Bed Conversion Kit';

/** Sell price in dollars: $368. Not the price-book cost ($155 + $49 = $204). OTO-401B stays $481. */
export const TWIN_BED_CONVERSION_PRICE = 368;

/** Brand part (a) Label, exact. */
export const TWIN_BED_CONVERSION_ADDON_LABEL =
  'Twin Bed Conversion Kit (sold separately)';

/** Brand part (a) Line, exact. */
export const TWIN_BED_CONVERSION_ADDON_LINE =
  'When your little one is ready, the Mini Newport converts to a single (twin) bed with the Twin Bed Conversion Kit, sold separately. As a twin bed, it measures 42 3/4"w x 36"h x 79 3/4"d.';

/** Brand part (b) 2-stage note, exact strings. */
export const MINI_NEWPORT_CONVERSION_NOTE_HEADING = 'Grows with them in two stages';
export const MINI_NEWPORT_CONVERSION_NOTE_STAGE_1_LABEL = 'Stage 1, Crib';
export const MINI_NEWPORT_CONVERSION_NOTE_STAGE_1 =
  'A compact crib made for smaller nurseries.';
export const MINI_NEWPORT_CONVERSION_NOTE_STAGE_2_LABEL = 'Stage 2, Single (twin) bed';
export const MINI_NEWPORT_CONVERSION_NOTE_STAGE_2 =
  'Add the Twin Bed Conversion Kit, sold separately, and the same Mini Newport becomes a single (twin) bed.';

export interface TwoStageNote {
  heading: string;
  stages: readonly { label: string; text: string }[];
}

export const MINI_NEWPORT_TWO_STAGE_NOTE: TwoStageNote = {
  heading: MINI_NEWPORT_CONVERSION_NOTE_HEADING,
  stages: [
    {
      label: MINI_NEWPORT_CONVERSION_NOTE_STAGE_1_LABEL,
      text: MINI_NEWPORT_CONVERSION_NOTE_STAGE_1,
    },
    {
      label: MINI_NEWPORT_CONVERSION_NOTE_STAGE_2_LABEL,
      text: MINI_NEWPORT_CONVERSION_NOTE_STAGE_2,
    },
  ],
};

export function isTwoStageTwinConversion(
  product: ConversionCatalogFields | null | undefined
): boolean {
  if (!product) return false;
  const pieces = [...(product.includes ?? []), ...(product.bundle ?? [])].filter(
    isConversionPiece
  );
  if (pieces.length === 0) return false;
  return pieces.every(
    p =>
      p.slug === TWIN_BED_CONVERSION_SLUG ||
      p.productName === TWIN_BED_CONVERSION_NAME
  );
}

/** The Mini-only 2-stage note, or null when this product is not that case. */
export function twoStageConversionNote(
  product: ConversionCatalogFields | null | undefined
): TwoStageNote | null {
  if (!isTwoStageTwinConversion(product)) return null;
  return MINI_NEWPORT_TWO_STAGE_NOTE;
}

/** Full-size convertible cribs: the existing "Built to convert as they grow" line. */
export function showsFourInOneConversionAssurance(
  product: ConversionCatalogFields | null | undefined
): boolean {
  return isConvertibleProduct(product) && !isTwoStageTwinConversion(product);
}
