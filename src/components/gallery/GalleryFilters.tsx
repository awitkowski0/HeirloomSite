'use client';

import { getStainColor, stainLabel } from '@/lib/stainColors';

/** Sentinel for "no finish filter applied", not a label - it is never rendered. */
export const ALL_FINISHES = '__all_finishes__';

interface FinishFilterProps {
  finishes: string[];
  selected: string;
  onSelect: (finish: string) => void;
}

/**
 * Finish filter pills.
 *
 * The wood filter that used to sit above this is gone. The shop sells one wood,
 * and a control with one option is not a control - it was already hidden, and
 * with it hidden the stain filter's "only show once a wood is chosen" gate
 * could never open, which would have left the page with no filters at all.
 */
export function FinishFilter({ finishes, selected, onSelect }: FinishFilterProps) {
  if (finishes.length === 0) return null;

  return (
    <div className="stain-filter-container" role="group" aria-label="Filter by finish">
      {finishes.map(finish => {
        const isSelected = selected === finish;
        const color = getStainColor(finish);
        return (
          <button
            key={finish}
            type="button"
            // Toggle rather than single-select, so aria-pressed is the right
            // state, not aria-checked.
            aria-pressed={isSelected}
            className={`stain-pill-btn ${isSelected ? 'stain-pill-btn--active' : ''}`}
            onClick={() => onSelect(finish)}
          >
            {color && <span className="stain-pill-dot" style={{ backgroundColor: color }} aria-hidden="true" />}
            {stainLabel(finish)}
          </button>
        );
      })}
    </div>
  );
}
