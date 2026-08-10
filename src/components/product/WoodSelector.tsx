'use client';

import { humanizeWood } from '@/lib/labels';

interface Props {
  woods: string[];
  selected: string;
  onSelect: (wood: string) => void;
  disabled: (wood: string) => boolean;
  label?: string;
}

export default function WoodSelector({
  woods,
  selected,
  onSelect,
  disabled,
  label = 'Select Option',
}: Props) {
  return (
    <section className="config-section">
      <div className="config-header">
        <h3 className="label-caps">01. {label}</h3>
      </div>
      <div className="wood-grid" role="radiogroup" aria-label={label}>
        {woods.map(wood => {
          const isDisabled = disabled(wood);
          const isSelected = selected === wood;
          return (
            <button
              key={wood}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isDisabled}
              className={[
                'wood-chip',
                isSelected ? 'selected' : '',
                isDisabled ? 'is-out-of-stock' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(wood)}
            >
              {humanizeWood(wood)}
              {isDisabled && <span className="wood-chip-oos">Sold Out</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
