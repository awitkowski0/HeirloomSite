/* The four crib styles a shopper picks between, each shown by a real crib photo. */
export const CRIB_STYLES = [
  { id: 'classic-slats', label: 'Classic Slats', top: 'Flat', front: 'Slatted', sampleSlug: 'mission' },
  { id: 'arched-slats', label: 'Arched Slats', top: 'Arched', front: 'Slatted', sampleSlug: 'arched-top' },
  { id: 'solid-panel', label: 'Solid Panel', top: 'Flat', front: 'Panel', sampleSlug: 'bloomington' },
  { id: 'arched-panel', label: 'Arched Panel', top: 'Arched', front: 'Panel', sampleSlug: 'moyerton' },
] as const;

export type CribStyleId = (typeof CRIB_STYLES)[number]['id'];
