/*
 * What the catalogue photographs actually show, for the places that have to
 * choose a picture. A note never changes what is for sale.
 *
 * `soft` names something inside the crib that the Safe Sleep page tells parents
 * to leave out. `render` means the frame may be a computer render and is waiting
 * on the builder. Both sort later wherever photos are being chosen.
 */
export interface PhotoNote {
  soft?: string;
  render?: boolean;
}

export const PHOTO_NOTES: Readonly<Record<string, PhotoNote>> = {
  darlington: { soft: 'bedding' },
  mission: { soft: 'pillow' },
  moyerton: { soft: 'pillow' },
  'arched-top': { soft: 'pillow and bedding' },
  'newport-crib': { render: true },
  'mackenzie-crib-slat-back': { soft: 'toy', render: true },
  'mackenzie-crib-panel-back': { soft: 'toy', render: true },
  'mackenzie-6-drawer-dresser': { render: true },
  'mackenzie-7-drawer-dresser': { render: true },
  'mackenzie-chest': { render: true },
  'mackenzie-nightstand': { render: true },
};

export type Foot = 'tapered' | 'post';

/*
 * The cribs the pick run may recommend, tagged by eye from their photographs.
 * Others stay for sale and in the catalog; their photos show a wood the site does
 * not sell, or soft items that a crop can't hide.
 */
export const PICK_CRIBS: Readonly<Record<string, { top: 'arched' | 'flat'; front: 'slats' | 'panel'; foot: Foot }>> = {
  bloomington: { top: 'flat', front: 'panel', foot: 'post' },
  darlington: { top: 'flat', front: 'panel', foot: 'post' },
  mission: { top: 'flat', front: 'slats', foot: 'post' },
  moyerton: { top: 'arched', front: 'panel', foot: 'post' },
  'arched-top': { top: 'arched', front: 'slats', foot: 'post' },
  'newport-crib': { top: 'flat', front: 'slats', foot: 'tapered' },
  'mackenzie-crib-slat-back': { top: 'flat', front: 'slats', foot: 'post' },
  'mackenzie-crib-panel-back': { top: 'flat', front: 'slats', foot: 'post' },
  'mini-newport-with-mattress': { top: 'flat', front: 'slats', foot: 'post' },
};

export function photoRank(slug: string): number {
  const note = PHOTO_NOTES[slug];
  return (note?.soft ? 2 : 0) + (note?.render ? 1 : 0);
}

export function softItemNote(slug: string): string | null {
  const soft = PHOTO_NOTES[slug]?.soft;
  return soft ? `The ${soft} in this photo is the builder’s styling. Keep the crib bare for sleep.` : null;
}
