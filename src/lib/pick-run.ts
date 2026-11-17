import type { ShopItem } from '@/lib/shop';

/*
 * Help me pick (/pick): seven "this or that" questions, then a short list of
 * real pieces that match. Each pair changes one thing. Every option names a
 * real piece, and cropped photos are used where a full frame would show
 * bedding.
 *
 * Pure functions over the catalogue the page was built with; the shopper's
 * answers live in src/context/selectionsStore.ts.
 */
export type { Side } from '@/context/selectionsParse';
import type { Side } from '@/context/selectionsParse';
export type Picks = Record<string, Side>;

export type Foot = 'tapered' | 'post';

/*
 * The cribs the picker may recommend, tagged by eye from their photographs.
 * Others stay for sale and in the catalogue; their photos show a wood the
 * site does not sell, or soft items a crop cannot hide.
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

/** The storage pieces a look can suggest, after the cribs. */
export const PICK_STORAGE = [
  'newport-4-drawer-chest',
  'mackenzie-chest',
  'newport-7-drawer-dresser',
  'mackenzie-6-drawer-dresser',
  'newport-nightstand',
];

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
  a: PairOption;
  b: PairOption;
}

export type ItemLookup = (slug: string) => ShopItem | undefined;

function photoOf(find: ItemLookup, slug: string, finish?: string): string {
  const item = find(slug);
  const match = finish ? item?.finishes.find(f => f.name === finish) : undefined;
  return match?.image ?? item?.defaultImage ?? '';
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
      teach: 'A curved top looks more traditional. A straight top fits more easily under a window or shelf.',
      a: { label: 'Curved', image: '/images/picks/top-arched.jpg', slug: 'arched-top' },
      b: { label: 'Straight', image: '/images/picks/top-flat.jpg', slug: 'mission' },
    },
    {
      id: 'front',
      question: 'Open slats or a solid front?',
      teach: 'With slats you can see the baby from across the room. A solid front hides the mattress.',
      a: { label: 'Open slats', image: '/images/picks/front-slats.jpg', slug: 'newport-crib' },
      b: { label: 'Solid front', image: '/images/picks/front-solid.jpg', slug: 'bloomington' },
    },
    {
      id: 'tone',
      question: 'Pale wood or dark?',
      teach: 'The same crib in two stains. Lighter stains show more of the grain. Darker stains hide scuffs better.',
      a: finishOption(find, 'bloomington', 'Natural'),
      b: finishOption(find, 'bloomington', 'Antique Slate'),
    },
    pale
      ? {
          id: 'warm',
          question: 'Warm or cooler?',
          teach: 'Warm stains have a honey tone. Cool stains are grayer and go well with white walls.',
          a: finishOption(find, 'bloomington', 'Natural'),
          b: finishOption(find, 'bloomington', 'Driftwood'),
        }
      : {
          id: 'warm',
          question: 'Warm or cooler?',
          teach: 'Warm dark stains are brown or reddish. Cool dark stains are closer to charcoal.',
          a: finishOption(find, 'bloomington', 'Harvest'),
          b: finishOption(find, 'bloomington', 'Antique Slate'),
        },
    {
      id: 'foot',
      question: 'Which legs?',
      teach: 'Tapered legs leave more floor showing, which helps in a small room. Straight posts look heavier.',
      a: { label: 'Tapered', image: '/images/picks/foot-tapered.jpg', slug: 'newport-crib' },
      b: { label: 'Straight posts', image: '/images/picks/foot-post.jpg', slug: 'bloomington' },
    },
    {
      id: 'size',
      question: 'Full size or mini?',
      teach: 'The mini comes with its own 24 by 40 inch mattress. We have no conversion kit listed for it.',
      a: { label: 'Full size', image: photoOf(find, 'newport-crib', 'Almond'), slug: 'newport-crib', finish: 'Almond' },
      b: {
        label: 'Mini',
        image: photoOf(find, 'mini-newport-with-mattress', 'Almond'),
        slug: 'mini-newport-with-mattress',
        finish: 'Almond',
      },
    },
    {
      id: 'store',
      question: 'Tall chest or wide dresser?',
      teach: 'A tall chest takes up less floor space. A wide dresser has a bigger top.',
      a: { label: 'Tall chest', image: photoOf(find, 'newport-4-drawer-chest'), slug: 'newport-4-drawer-chest' },
      b: { label: 'Wide dresser', image: '/images/picks/wide-dresser.jpg', slug: 'newport-7-drawer-dresser' },
    },
  ];
}

export interface Prefs {
  top?: 'arched' | 'flat';
  front?: 'slats' | 'panel';
  foot?: Foot;
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

/** The photo closest to a stain: the same name, or failing that the same tone. */
export function finishFor(item: ShopItem, wanted: string | undefined): { finish: string | null; exact: boolean } {
  const real = item.finishes;
  if (real.length < 2) return { finish: real[0]?.name ?? null, exact: !wanted };
  if (wanted) {
    if (real.some(f => f.name === wanted)) return { finish: wanted, exact: true };
    const tone = /slate|ebony|carbon|washington|asbury|manchester|earthtone/i.test(wanted) ? 'dark' : 'light';
    return { finish: (real.find(f => f.tone === tone) ?? real[0]).name, exact: false };
  }
  return { finish: (real.find(f => f.name === 'Natural') ?? real[0]).name, exact: true };
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
      notes.push(
        `We don’t carry ${prefs.top === 'arched' ? 'a curved top' : 'that shape'} with tapered legs. These match your top and front, and they have straight posts.`,
      );
    }
  }
  if (prefs.size === 'mini') {
    const mini = cribs.filter(i => i.category === 'Mini Cribs');
    if (mini.length > 0) cribs = mini;
    else notes.push('Our one mini has a straight top and slats, so it didn’t fit these picks.');
  }
  if (prefs.size === 'full') cribs = cribs.filter(i => i.category !== 'Mini Cribs');
  const ordered = [...cribs].sort((a, b) => a.minPrice - b.minPrice);
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
