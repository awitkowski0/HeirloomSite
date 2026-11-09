/*
 * Light, mid or dark for each stain, measured from the catalogue photographs
 * (mean brightness of the wood across every crib that offers the stain). A stain
 * name is a poor guide: Almond measures darker than Provincial.
 */
export type Tone = 'light' | 'mid' | 'dark';

export const TONES: readonly { id: Tone; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'mid', label: 'Mid' },
  { id: 'dark', label: 'Dark' },
];

const TONE_BY_FINISH: Readonly<Record<string, Tone>> = {
  frost: 'light',
  natural: 'light',
  mx: 'light',
  driftwood: 'light',
  fruitwood: 'light',
  provincial: 'light',
  seely: 'mid',
  harvest: 'mid',
  sandstone: 'mid',
  smoke: 'mid',
  almond: 'mid',
  'michaels cherry': 'mid',
  'antique slate': 'dark',
  'asbury brown': 'dark',
  washington: 'dark',
  carbon: 'dark',
  earthtone: 'dark',
  manchester: 'dark',
  ebony: 'dark',
};

/** The tone for a finish name, or null for one nobody has measured yet. */
export function toneOf(finish: string): Tone | null {
  return TONE_BY_FINISH[finish.trim().toLowerCase()] ?? null;
}
