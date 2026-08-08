'use client';

import type { Stain } from '@/types';
import { getStainColor, stainLabel } from '@/lib/stainColors';
import { formatPrice } from '@/lib/format';

interface Props {
  stains: Stain[];
  selected: string;
  onSelect: (name: string) => void;
  label?: string;
}

/**
 * Stain / finish picker. ONE component, ONE instance, ONE DOM tree.
 *
 * There were previously two components - StainSelector and StainStripMobile -
 * both mounted unconditionally on every product page with identical props and
 * hidden from each other with CSS. Because display:none does not stop an <img>
 * from loading, a 12-stain product issued 24 image requests for 12 visible
 * swatches.
 *
 * The two presentations were never different controls, only different layouts
 * of the same buttons: a horizontal swatch rail on narrow screens, a vertical
 * list with names, prices and stock state on wide ones. So this renders one set
 * of buttons, each carrying both the swatch and the text, and CSS decides which
 * parts are visible at which width. The text stays in the accessibility tree in
 * both layouts (it is hidden with a visually-hidden pattern, not display:none),
 * so screen-reader users get the full label regardless of viewport.
 *
 * Other fixes over the old strip: swatch buttons had no accessible name at all
 * when a stain had no image (announced as a bare "button"), selection was
 * conveyed only by transform: scale(1.15), and out-of-stock was signalled
 * purely by opacity.
 */
export default function StainSelector({
  stains,
  selected,
  onSelect,
  label = 'Choose Stain Finish',
}: Props) {
  if (stains.length === 0) return null;

  return (
    <section className="config-section stain-section">
      <div className="config-header">
        <h3 className="label-caps">02. {label}</h3>
      </div>
      <div className="stain-list" role="radiogroup" aria-label={label}>
        {stains.map(stain => {
          const isSelected = selected === stain.name;
          const color = getStainColor(stain.name);
          const display = stainLabel(stain.name);
          const priceNote =
            stain.priceAddition > 0 ? `, plus ${formatPrice(stain.priceAddition)}` : '';
          const stockNote = stain.inStock ? '' : ', out of stock';

          return (
            <button
              key={stain.name}
              type="button"
              role="radio"
              aria-checked={isSelected}
              // Explicit name: in the compact layout the text below is visually
              // hidden, and a stain without an image would otherwise leave the
              // button with no accessible name at all.
              aria-label={`${display}${priceNote}${stockNote}`}
              disabled={!stain.inStock}
              className={[
                'stain-button',
                isSelected ? 'selected' : '',
                !stain.inStock ? 'is-out-of-stock' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(stain.name)}
            >
              {color === null ? (
                // Rug sizes reuse this control; a wood-coloured swatch would be
                // meaningless, so show the size as text.
                <span className="stain-size-chip">{display}</span>
              ) : (
                <span className="stain-swatch" style={{ backgroundColor: color }}>
                  {stain.image ? (
                    // A 40px swatch: the optimizer round-trip costs more than
                    // it saves, and would multiply Vercel image transformations
                    // by every stain on every product.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stain.image} alt="" loading="lazy" className="stain-swatch-img" />
                  ) : null}
                </span>
              )}

              <span className="stain-info" aria-hidden="true">
                <span className="body-md stain-name">
                  {display}
                  {stain.priceAddition > 0 && (
                    <span className="stain-surcharge"> (+{formatPrice(stain.priceAddition)})</span>
                  )}
                  {!stain.inStock && <span className="stain-oos">[Out of Stock]</span>}
                </span>
                {color !== null && (
                  <span className="label-caps stain-desc">
                    {display.toLowerCase().includes('natural')
                      ? "Enhances the wood's inherent character"
                      : 'Sophisticated artisan pigment'}
                  </span>
                )}
              </span>

              {isSelected && (
                <span className="material-symbols-outlined stain-check" aria-hidden="true">
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
