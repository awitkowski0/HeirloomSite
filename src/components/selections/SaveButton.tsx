'use client';

import { toggleSaved, useSelections, type SavedPiece } from '@/context/selectionsStore';

/**
 * "Save" on a piece: keeps it in the side rail's Saved tab, and on the
 * Babylist tab, without touching the cart. Saving the same piece again with a
 * different finish replaces nothing - press Saved to remove, then save again.
 */
export default function SaveButton({ piece }: { piece: SavedPiece }) {
  const { saved } = useSelections();
  const isSaved = saved.some(p => p.slug === piece.slug);
  return (
    <button type="button" className="filter-link" aria-pressed={isSaved} onClick={() => toggleSaved(piece)}>
      {isSaved ? 'Saved' : 'Save'}
    </button>
  );
}
