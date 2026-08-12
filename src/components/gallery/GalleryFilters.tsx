'use client';

import { humanizeWood } from '@/lib/labels';
import { getStainColor, stainLabel } from '@/lib/stainColors';

export const ALL_WOODS = 'All Collections';
export const ALL_STAINS = 'All Stains';

interface WoodFilterProps {
  woods: string[];
  selected: string;
  onSelect: (wood: string) => void;
  onReset: () => void;
}

export function WoodFilter({ woods, selected, onSelect, onReset }: WoodFilterProps) {
  return (
    <div className="filter-pills" role="radiogroup" aria-label="Filter by wood">
      <button
        type="button"
        role="radio"
        aria-checked={selected === ALL_WOODS}
        className={`filter-pill-btn ${selected === ALL_WOODS ? 'filter-pill-btn--active' : ''}`}
        onClick={onReset}
      >
        Our Cribs
      </button>

      <span className="filter-pill-divider" aria-hidden="true" />

      {woods.map(w => (
        <button
          key={w}
          type="button"
          role="radio"
          aria-checked={selected === w}
          className={`filter-pill-btn ${selected === w ? 'filter-pill-btn--active' : ''}`}
          onClick={() => onSelect(w)}
        >
          {humanizeWood(w)}
        </button>
      ))}
    </div>
  );
}

interface StainFilterProps {
  stains: string[];
  selected: string;
  onSelect: (stain: string) => void;
}

export function StainFilter({ stains, selected, onSelect }: StainFilterProps) {
  if (stains.length === 0) return null;

  return (
    <div className="stain-filter-container" role="group" aria-label="Filter by stain">
      {stains.map(stain => {
        const isSelected = selected === stain;
        const color = getStainColor(stain);
        return (
          <button
            key={stain}
            type="button"
            // Toggle rather than single-select, so aria-pressed is the right
            // state, not aria-checked.
            aria-pressed={isSelected}
            className={`stain-pill-btn ${isSelected ? 'stain-pill-btn--active' : ''}`}
            onClick={() => onSelect(stain)}
          >
            {color && <span className="stain-pill-dot" style={{ backgroundColor: color }} aria-hidden="true" />}
            {stainLabel(stain)}
          </button>
        );
      })}
    </div>
  );
}
