import { PICK_CRIBS, photoRank } from '@/lib/photo-notes';
import type { ShopItem } from '@/lib/shop';

/*
 * The This or That run. Each pair changes one thing. Every option names a real
 * piece, so a pick can count toward a shopper's taste, and crops are used where
 * a full frame would show bedding.
 */
export type Side = 'a' | 'b' | 'skip';
export type Picks = Record<string, Side>;

export interface PairOption {
  label: string;
  image: string;
  slug: string;
  finish?: string;
}

export interface Pair {
  id: string;
  question: string;
  teach: string;
  /** Both sides are one photo, recolored. */
  preview?: boolean;
  a: PairOption;
  b: PairOption;
}

export type ItemLookup = (slug: string) => ShopItem | undefined;

function photoOf(find: ItemLookup, slug: string, finish?: string): string {
  const item = find(slug);
  const match = finish ? item?.finishImages.find(f => f.name === finish) : undefined;
  return match?.image ?? item?.image ?? '';
}

const finishOption = (find: ItemLookup, slug: string, finish: string): PairOption => ({
  label: finish,
  slug,
  finish,
  image: photoOf(find, slug, finish),
});

export function pairsFor(picks: Picks, find: ItemLookup): Pair[] {
  const pale = picks.tone !== 'b';
  return [
    {
      id: 'top',
      question: 'Curved across the top, or straight?',
      teach: 'A curve softens a plain wall. A straight rail tucks neatly under a window or shelf.',
      a: { label: 'Curved', image: '/images/picks/top-arched.jpg', slug: 'arched-top' },
      b: { label: 'Straight', image: '/images/picks/top-flat.jpg', slug: 'mission' },
    },
    {
      id: 'front',
      question: 'Open slats or a solid front?',
      teach: 'Slats let you see in from across the room. A solid front hides the mattress and reads more like furniture.',
      a: { label: 'Open slats', image: '/images/picks/front-slats.jpg', slug: 'newport-crib' },
      b: { label: 'Solid front', image: '/images/picks/front-solid.jpg', slug: 'bloomington' },
    },
    {
      id: 'tone',
      question: 'Pale wood or dark?',
      preview: true,
      teach: 'Same crib, two stains. Pale shows the grain. Dark hides scuffs better and anchors a light room.',
      a: finishOption(find, 'bloomington', 'Natural'),
      b: finishOption(find, 'bloomington', 'Antique Slate'),
    },
    pale
      ? {
          id: 'warm',
          question: 'Warm or cooler?',
          preview: true,
          teach: 'Warm leans honey. Cool leans gray, and pairs well with white walls.',
          a: finishOption(find, 'bloomington', 'Natural'),
          b: finishOption(find, 'bloomington', 'Driftwood'),
        }
      : {
          id: 'warm',
          question: 'Warm or cooler?',
          preview: true,
          teach: 'Warm leans brown and red. Cool leans charcoal, and looks more modern next to white.',
          a: finishOption(find, 'bloomington', 'Harvest'),
          b: finishOption(find, 'bloomington', 'Antique Slate'),
        },
    {
      id: 'foot',
      question: 'Which legs?',
      teach: 'Tapered legs show more floor, so a small room feels bigger. Straight posts look sturdier.',
      a: { label: 'Tapered', image: '/images/picks/foot-tapered.jpg', slug: 'newport-crib' },
      b: { label: 'Straight posts', image: '/images/picks/foot-post.jpg', slug: 'bloomington' },
    },
    {
      id: 'size',
      question: 'Full size or mini?',
      teach: 'The mini comes with its own 24 by 40 inch mattress. We have no conversion kit listed for it.',
      a: { label: 'Full size', image: photoOf(find, 'newport-crib', 'Almond'), slug: 'newport-crib', finish: 'Almond' },
      b: { label: 'Mini', image: photoOf(find, 'mini-newport-with-mattress', 'Almond'), slug: 'mini-newport-with-mattress', finish: 'Almond' },
    },
    {
      id: 'store',
      question: 'Tall chest or wide dresser?',
      teach: 'A chest takes less floor. A wide dresser gives you a flat top to work on.',
      a: { label: 'Tall chest', image: photoOf(find, 'newport-4-drawer-chest'), slug: 'newport-4-drawer-chest' },
      b: { label: 'Wide dresser', image: '/images/picks/wide-dresser.jpg', slug: 'newport-7-drawer-dresser' },
    },
  ];
}

export interface Prefs {
  top?: 'arched' | 'flat';
  front?: 'slats' | 'panel';
  foot?: 'tapered' | 'post';
  size?: 'full' | 'mini';
  store?: 'tall' | 'wide';
  finish?: string;
}

export function prefsFrom(picks: Picks, find: ItemLookup): Prefs {
  const out: Prefs = {};
  if (picks.top === 'a') out.top = 'arched';
  if (picks.top === 'b') out.top = 'flat';
  if (picks.front === 'a') out.front = 'slats';
  if (picks.front === 'b') out.front = 'panel';
  if (picks.foot === 'a') out.foot = 'tapered';
  if (picks.foot === 'b') out.foot = 'post';
  if (picks.size === 'a') out.size = 'full';
  if (picks.size === 'b') out.size = 'mini';
  if (picks.store === 'a') out.store = 'tall';
  if (picks.store === 'b') out.store = 'wide';
  const pairs = pairsFor(picks, find);
  const warm = pairs.find(p => p.id === 'warm');
  const tone = pairs.find(p => p.id === 'tone');
  if (warm && (picks.warm === 'a' || picks.warm === 'b')) out.finish = warm[picks.warm].finish;
  else if (tone && (picks.tone === 'a' || picks.tone === 'b')) out.finish = tone[picks.tone].finish;
  return out;
}

export function tasteWords(prefs: Prefs): string[] {
  const words: string[] = [];
  if (prefs.top) words.push(prefs.top === 'arched' ? 'curved top' : 'straight top');
  if (prefs.front) words.push(prefs.front === 'slats' ? 'open slats' : 'solid front');
  if (prefs.finish) words.push(prefs.finish);
  if (prefs.foot) words.push(prefs.foot === 'tapered' ? 'tapered legs' : 'straight posts');
  if (prefs.size === 'mini') words.push('mini');
  if (prefs.store) words.push(prefs.store === 'tall' ? 'tall chest' : 'wide dresser');
  return words;
}

export interface LookCrib {
  item: ShopItem;
  finish: string | null;
  note: string | null;
}

export interface Look {
  prefs: Prefs;
  cribs: LookCrib[];
  storage: ShopItem[];
  notes: string[];
}

/** The photo closest to a stain: the same name, or failing that the same tone. */
export function finishFor(item: ShopItem, wanted: string | undefined): { finish: string | null; exact: boolean } {
  const real = item.finishImages;
  if (real.length < 2) return { finish: real[0]?.name ?? null, exact: !wanted };
  if (wanted) {
    if (real.some(f => f.name === wanted)) return { finish: wanted, exact: true };
    const tone = real.find(f => f.name === wanted)?.tone ?? (/slate|ebony|carbon|washington/i.test(wanted) ? 'dark' : 'light');
    return { finish: (real.find(f => f.tone === tone) ?? real[0]).name, exact: false };
  }
  return { finish: (real.find(f => f.name === 'Natural') ?? real[0]).name, exact: true };
}

export function buildLook(picks: Picks, items: readonly ShopItem[]): Look {
  const find: ItemLookup = slug => items.find(i => i.slug === slug);
  const prefs = prefsFrom(picks, find);
  const notes: string[] = [];
  const tagged = items.filter(i => PICK_CRIBS[i.slug]);
  let cribs = tagged.filter(i => {
    const tag = PICK_CRIBS[i.slug];
    return (!prefs.top || tag.top === prefs.top) && (!prefs.front || tag.front === prefs.front);
  });
  const shape = cribs;
  if (prefs.foot) cribs = cribs.filter(i => PICK_CRIBS[i.slug].foot === prefs.foot);
  if (cribs.length === 0) {
    cribs = shape;
    if (prefs.foot === 'tapered') {
      notes.push(`We don’t carry ${prefs.top === 'arched' ? 'a curved top' : 'that shape'} with tapered legs. These match your top and front, and they have straight posts.`);
    }
  }
  if (prefs.size === 'mini') {
    const mini = cribs.filter(i => i.category === 'Mini Cribs');
    if (mini.length > 0) cribs = mini;
    else notes.push('Our one mini has a straight top and slats, so it didn’t fit these picks.');
  }
  if (prefs.size === 'full') cribs = cribs.filter(i => i.category !== 'Mini Cribs');
  const ordered = [...cribs].sort((a, b) => photoRank(a.slug) - photoRank(b.slug) || a.price - b.price);
  const storageSlugs =
    prefs.store === 'tall'
      ? ['newport-4-drawer-chest', 'mackenzie-chest']
      : prefs.store === 'wide'
        ? ['newport-7-drawer-dresser', 'mackenzie-6-drawer-dresser']
        : [];
  return {
    prefs,
    notes,
    cribs: ordered.map(item => {
      const chosen = finishFor(item, prefs.finish);
      return {
        item,
        finish: chosen.finish,
        note: prefs.finish && !chosen.exact ? `No ${prefs.finish} photo of this one. Showing ${chosen.finish}.` : null,
      };
    }),
    storage: [...storageSlugs, 'newport-nightstand'].flatMap(slug => {
      const item = find(slug);
      return item ? [item] : [];
    }),
  };
}
