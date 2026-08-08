'use client';

import type { Stain } from '@/types';
import { getStainColor, stainLabel } from '@/lib/stainColors';
import { formatPrice } from '@/lib/format';

interface Props {
  stains: Stain[];
  selected: string;
  onSelect: (name: string) => void;
  /** Compact horizontal strip (mobile) vs. full list with descriptions. */
  variant?: 'list' | 'strip';
  label?: string;
}

/**
 * Stain / finish picker.
 *
 * This is now ONE component. Previously StainSelector and StainStripMobile were
 * both rendered unconditionally on every product page with identical props and
 * hidden from each other with CSS - so every stain image was requested twice
 * (display:none does not prevent <img src> fetching). A 12-stain product issued
 * 24 image requests, half of which could never be seen.
 *
 * Accessibility fixes over the old strip: swatch buttons had no accessible name
 * at all when a stain had no image (announced as bare "button"), selection was
 * conveyed only by transform: scale(1.15), and out-of-stock was signalled purely
 * by opacity.
 */
export default function StainSelector({
  stains,
  selected,
  onSelect,
  variant = 'list',
  label = 'Choose Stain Finish',
}: Props) {
  if (stains.length === 0) return null;

  const isStrip = variant === 'strip';

  return (
    <section className={isStrip ? 'stain-strip' : 'config-section stain-section'}>
      {!isStrip && (
        <div className="config-header">
          <h3 className="label-caps">02. {label}</h3>
        </div>
      )}
      <div
        className={isStrip ? 'stain-strip-list' : 'stain-list'}
        role="radiogroup"
        aria-label={label}
      >
        {stains.map(stain => {
          const isSelected = selected === stain.name;
          const color = getStainColor(stain.name);
          const display = stainLabel(stain.name);
          const priceNote = stain.priceAddition > 0 ? `, plus ${formatPrice(stain.priceAddition)}` : '';
          const stockNote = stain.inStock ? '' : ', out of stock';

          return (
            <button
              key={stain.name}
              type="button"
              role="radio"
              aria-checked={isSelected}
              // The strip has no visible text, so it needs an explicit name.
              aria-label={isStrip ? `${display}${priceNote}${stockNote}` : undefined}
              disabled={!stain.inStock}
              className={[
                isStrip ? 'stain-strip-swatch' : 'stain-button',
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

              {!isStrip && (
                <span className="stain-info">
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
              )}

              {!isStrip && isSelected && (
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
