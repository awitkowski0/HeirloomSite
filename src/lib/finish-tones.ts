/*
 * Light, mid or dark for each stain, measured from the catalogue photographs
 * (mean brightness of the wood across every crib that offers the stain). A
 * stain name is a poor guide: Almond measures darker than Provincial.
 *
 * The listing grid's "Light wood" / "Dark wood" filter reads this. A stain
 * missing from the table has no tone and simply never matches either filter,
 * so a new stain degrades to "not filterable" rather than "filed wrong".
 */
export type Tone = 'light' | 'mid' | 'dark';

const TONE_BY_FINISH: Readonly<Record<string, Tone>> = {
  frost: 'light',
  natural: 'light',
  mx: 'light',
  driftwood: 'light',
  fruitwood: 'light',
  provincial: 'light',
  seely: 'mid',
  sealy: 'mid',
  harvest: 'mid',
  sandstone: 'mid',
  smoke: 'mid',
  almond: 'mid',
  'michaels cherry': 'mid',
  "michael's cherry": 'mid',
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
