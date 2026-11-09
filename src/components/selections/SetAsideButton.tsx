'use client';

import type { ShopItem } from '@/lib/shop';
import { isSetAside, toggleSetAside, useSelections } from '@/context/selectionsStore';

export default function SetAsideButton({ item, className = '' }: { item: ShopItem; className?: string }) {
  const selected = isSetAside(useSelections(), item.slug);
  return (
    <button
      type="button"
      className={`set-aside ${className}`}
      aria-pressed={selected}
      aria-label={`${selected ? 'Remove' : 'Set aside'} ${item.name}`}
      onClick={() => toggleSetAside(item)}
    >
      <span aria-hidden="true">{selected ? '✓' : '+'}</span> {selected ? 'Set aside' : 'Set aside'}
    </button>
  );
}
