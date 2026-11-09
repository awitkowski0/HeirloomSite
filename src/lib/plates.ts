import 'server-only';

import { getBrowsableProducts, getProductIndex } from '@/lib/content';
import { toShopItems, type ShopItem } from '@/lib/shop';

/*
 * The edited pairs: the opening of the catalog.
 *
 * Every photograph here was checked by hand. Most catalogue crib frames show
 * bumpers, pillows or bedding that the Safe Sleep page tells parents to leave
 * out, or a wood the site does not sell, so a plate names its exact files rather
 * than taking a product's default image. tests/plates.test.ts holds this list to
 * the cribs cleared for use.
 *
 * `box` is the piece's bounding box in that file. It lets two different
 * photographs stand on one floor line at matched scale without new image files.
 * Finishes of one crib are the same frame recoloured, so one box serves them all.
 *
 * The opinions are draft copy in the family's "we", awaiting the family's
 * approval. They carry no safety, testing or origin claim.
 */
interface SideSpec {
  slug: string;
  dir: string;
  file: string;
  size: readonly [number, number];
  box: readonly [number, number, number, number];
  /** How tall the piece stands, as a percent of the frame. */
  height: number;
  /** Shown beside the name when it is not simply the piece's default. */
  note?: string;
}

export interface PlateSpec {
  id: string;
  title: string;
  opinion: string;
  keywords: readonly string[];
  left: SideSpec;
  right: SideSpec;
  /** Same-index recolours, on plates where both sides have the finish. */
  finishes?: readonly { name: string; left: string; right: string }[];
  colorNote?: boolean;
}

const MAC_SLAT = 'Mackenzie Crib (Slat Back)';
const MAC_PANEL = 'Mackenzie Crib (Panel Back)';
const MAC_BOX = [202, 206, 916, 766] as const;
const MAC_SIZE = [1120, 928] as const;
const BLOOM_SIZE = [2048, 1779] as const;
const FRAME_1200 = [1200, 1000] as const;

const macSlat = (n: number, height = 80): SideSpec => ({
  slug: 'mackenzie-crib-slat-back', dir: MAC_SLAT, file: `mackenzie_crib_slat_back_${n}.jpg`, size: MAC_SIZE, box: MAC_BOX, height,
});
const macPanel = (n: number, height = 80): SideSpec => ({
  slug: 'mackenzie-crib-panel-back', dir: MAC_PANEL, file: `mackenzie_crib_panel_back_${n}.jpg`, size: MAC_SIZE, box: MAC_BOX, height,
});
const bloomington = (n: number, note?: string): SideSpec => ({
  slug: 'bloomington', dir: 'Bloomington', file: `bloomington_${n}.jpg`, size: BLOOM_SIZE, box: [211, 192, 1926, 1621], height: 80, ...(note ? { note } : {}),
});
const dresser6: SideSpec = {
  slug: 'mackenzie-6-drawer-dresser', dir: 'Mackenzie 6 Drawer Dresser', file: 'mackenzie_6_drawer_dresser_0.jpg', size: FRAME_1200, box: [72, 173, 1127, 872], height: 66,
};
const chest: SideSpec = {
  slug: 'mackenzie-chest', dir: 'Mackenzie Chest', file: 'mackenzie_chest_0.jpg', size: FRAME_1200, box: [304, 144, 945, 918], height: 88,
};
const nightstand: SideSpec = {
  slug: 'mackenzie-nightstand', dir: 'Mackenzie Nightstand', file: 'mackenzie_nightstand_0.jpg', size: FRAME_1200, box: [212, 88, 971, 937], height: 62,
};
const newportChest: SideSpec = {
  slug: 'newport-4-drawer-chest', dir: 'Newport 4 Drawer Chest', file: 'newport_4_drawer_chest_0.jpg', size: FRAME_1200, box: [250, 105, 972, 918], height: 84,
};
const newportStand: SideSpec = {
  slug: 'newport-nightstand', dir: 'Newport Nightstand', file: 'newport_nightstand_0.jpg', size: FRAME_1200, box: [282, 112, 939, 930], height: 62,
};
const newportDresser: SideSpec = {
  slug: 'newport-7-drawer-dresser', dir: 'Newport 7 Drawer Dresser', file: 'newport_7_drawer_dresser_0.jpg', size: FRAME_1200, box: [249, 50, 983, 948], height: 92,
};

const ALL_PLATES: readonly PlateSpec[] = [
  {
    id: 'panel-or-slat',
    title: 'Panel or Slat',
    opinion: 'Same crib, same price. Take the panel if the crib sits against a busy wall. Take the slats if you want to see through to the window.',
    keywords: ['panel', 'slat', 'slats', 'back', 'mackenzie', 'crib'],
    left: macPanel(1),
    right: macSlat(1),
    finishes: [
      { name: 'Almond', left: 'mackenzie_crib_panel_back_1.jpg', right: 'mackenzie_crib_slat_back_1.jpg' },
      { name: 'Harvest', left: 'mackenzie_crib_panel_back_6.jpg', right: 'mackenzie_crib_slat_back_6.jpg' },
      { name: 'Asbury Brown', left: 'mackenzie_crib_panel_back_2.jpg', right: 'mackenzie_crib_slat_back_2.jpg' },
      { name: 'Carbon', left: 'mackenzie_crib_panel_back_3.jpg', right: 'mackenzie_crib_slat_back_3.jpg' },
    ],
    colorNote: true,
  },
  {
    id: 'open-or-solid',
    title: 'Open or Solid',
    opinion: 'Two shops, two ideas of a crib. The Bloomington is square and plain with a solid front. The Mackenzie has more going on at the post and foot.',
    keywords: ['open', 'solid', 'modern', 'simple', 'plain', 'clean'],
    left: bloomington(6),
    right: macSlat(6),
  },
  {
    id: 'light-or-dark',
    title: 'Light or Dark',
    opinion: 'This is the same Bloomington in two finishes. A pale crib fades into a pale room. A dark one is the first thing you notice.',
    keywords: ['light', 'dark', 'finish', 'stain', 'color', 'colour', 'slate', 'natural', 'black', 'espresso'],
    left: bloomington(6, 'Natural'),
    right: bloomington(0, 'Antique Slate'),
    colorNote: true,
  },
  {
    id: 'what-it-becomes',
    title: 'What It Becomes',
    opinion: 'A crib is only a crib for a couple of years. These are the Newport kits. Look at what you will be living with after that.',
    keywords: ['toddler', 'bed', 'grow', 'convert', 'conversion', 'later', 'full', 'years', 'keep'],
    left: { slug: 'newport-toddler-bed', dir: 'Newport Toddler Bed', file: 'newport_toddler_bed_0_v2.jpg', size: FRAME_1200, box: [154, 153, 997, 839], height: 70 },
    right: { slug: 'newport-full-bed-rail-kit', dir: 'Newport Full Bed Rail Kit', file: 'newport_full_bed_rail_kit_0_v2.jpg', size: FRAME_1200, box: [83, 200, 1111, 792], height: 58 },
  },
  {
    id: 'wide-or-tall',
    title: 'Wide or Tall',
    opinion: 'Measure the wall first. The dresser gives you a top you can use. The chest takes up less floor.',
    keywords: ['small', 'room', 'space', 'chest', 'narrow', 'tall', 'wide', 'apartment', 'dresser', 'drawer', 'drawers', 'storage', 'clothes'],
    left: { ...newportDresser, height: 90 },
    right: newportChest,
  },
  {
    id: 'refined-or-rustic',
    title: 'Refined or Rustic',
    opinion: 'Both come from Old Town Oak. The Mackenzie is tidy and traditional. The Newport shows every streak in the wood. If you like a room that looks lived in, go with the Newport.',
    keywords: ['rustic', 'refined', 'traditional', 'farmhouse', 'wood grain', 'newport'],
    left: chest,
    right: newportChest,
  },
  {
    id: 'drawers-or-shelf',
    title: 'Drawers or Shelf',
    opinion: 'Three drawers hide everything. The shelf holds the books you read every night. We would pick the shelf, and plenty of people would not.',
    keywords: ['nightstand', 'shelf', 'bedside', 'books'],
    left: nightstand,
    right: newportStand,
  },
];

/*
 * Organised by look. The Bloomington and Newport storage frames read as real
 * studio photographs, so they lead. The photo audit flagged the Mackenzie frames
 * as possible 3D renders; they stay only where no clean real crib frame exists.
 */
const ORDER = ['light-or-dark', 'open-or-solid', 'panel-or-slat', 'refined-or-rustic', 'drawers-or-shelf', 'wide-or-tall', 'what-it-becomes'];
export const PLATE_SPECS: readonly PlateSpec[] = ORDER.map(id => {
  const spec = ALL_PLATES.find(p => p.id === id);
  if (!spec) throw new Error(`Unknown plate: ${id}`);
  return spec;
});

export interface LearnCard {
  after: string;
  title: string;
  body: string;
  sketch?: { src: string; alt: string; width: number; height: number };
}

/*
 * General woodworking and ordering facts only. A statement about a specific
 * piece belongs in the builder records, with its source, and nothing here may
 * make a safety claim.
 */
export const LEARN_CARDS: readonly LearnCard[] = [
  {
    after: 'panel-or-slat',
    title: 'Slat or Panel',
    body: 'Slats are separate upright bars, so you see through them. A panel is a flat board held in a frame, so it reads heavier and hides what is behind it.',
  },
  {
    after: 'light-or-dark',
    title: 'Veneer or Solid',
    body: 'Veneer is a thin slice of wood glued over another material, often particle board. Solid wood is the same wood all the way through.',
  },
  {
    after: 'refined-or-rustic',
    title: 'Mortise and Tenon',
    body: 'One piece of wood ends in a tongue, the tenon, that fits a slot cut in another, the mortise. It is one of the oldest ways to join wood.',
    sketch: { src: '/images/brand/assembly.jpg', alt: 'Pencil sketch of furniture being assembled', width: 1728, height: 1152 },
  },
  {
    after: 'drawers-or-shelf',
    title: 'Why It Takes Weeks',
    body: 'Made to order means the builder starts after you order. Lead times run from about 6 to 14 weeks, depending on the shop.',
  },
  {
    after: 'wide-or-tall',
    title: 'Dovetails',
    body: 'A dovetail is a set of interlocking, fan-shaped cuts at the corner of a drawer. The shape holds the corner together when the drawer is pulled.',
  },
  {
    after: 'what-it-becomes',
    title: 'What Converts When',
    body: 'A convertible crib changes with kits. A toddler rail replaces the front, and later bed rails join the headboard and footboard. Kits vary by model.',
  },
];

interface SetSpec {
  id: string;
  title: string;
  note: string;
  pieces: readonly SideSpec[];
}

/* Newport's crib is left out: its catalogue frames show a heavy comforter inside. */
const SET_SPECS: readonly SetSpec[] = [
  {
    id: 'mackenzie-nursery',
    title: 'The Mackenzie Nursery',
    note: 'A crib, dresser, chest and nightstand that were made to go together.',
    pieces: [macSlat(6, 74), { ...dresser6, height: 58 }, { ...chest, height: 80 }, { ...nightstand, height: 52 }],
  },
  {
    id: 'newport-storage',
    title: 'Newport Storage',
    note: 'Three storage pieces with a lot of grain showing.',
    pieces: [{ ...newportDresser, height: 88 }, { ...newportChest, height: 72 }, { ...newportStand, height: 52 }],
  },
];

export interface PlateSide {
  item: ShopItem;
  image: string;
  frame: { left: string; bottom: string; width: string; height: string };
  note: string | null;
}

export interface Plate {
  id: string;
  number: string;
  title: string;
  opinion: string;
  keywords: readonly string[];
  left: PlateSide;
  right: PlateSide;
  finishes: readonly { name: string; left: string; right: string }[];
  colorNote: boolean;
}

export interface NurserySet {
  id: string;
  title: string;
  note: string;
  pieces: PlateSide[];
  fromTotal: number;
}

const FRAME_ASPECT = 4 / 3;
const pct = (n: number) => `${Number(n.toFixed(3))}%`;
const imageUrl = (dir: string, file: string) => `/data/products/${encodeURIComponent(dir)}/${file}`;

function resolve(spec: SideSpec, bySlug: Map<string, ShopItem>, aspect = FRAME_ASPECT): PlateSide {
  const item = bySlug.get(spec.slug);
  // A plate that silently lost a side would be a broken spread on the homepage.
  if (!item) throw new Error(`Plate references unknown product: ${spec.slug}`);
  const [w, h] = spec.size;
  const [x0, y0, x1, y1] = spec.box;
  const imageHeight = (spec.height * h) / (y1 - y0);
  const imageWidth = (imageHeight * (w / h)) / aspect;
  return {
    item,
    image: imageUrl(spec.dir, spec.file),
    note: spec.note ?? null,
    frame: {
      left: pct(50 - ((x0 + x1) / 2 / w) * imageWidth),
      // The bottom of the piece lands exactly on the frame's lower edge.
      bottom: pct(-((h - y1) / h) * imageHeight),
      width: pct(imageWidth),
      height: pct(imageHeight),
    },
  };
}

/** Includes the kits, which are unlisted but are the point of one plate. */
function itemsBySlug(): Map<string, ShopItem> {
  const browsable = new Set(getBrowsableProducts().map(p => p.slug));
  const kits = getProductIndex().filter(p => !browsable.has(p.slug) && /newport-(toddler-bed|full-bed-rail-kit)/.test(p.slug));
  return new Map(toShopItems([...getBrowsableProducts(), ...kits]).map(i => [i.slug, i]));
}

export function getPlates(): Plate[] {
  const bySlug = itemsBySlug();
  return PLATE_SPECS.map((spec, index) => ({
    id: spec.id,
    number: String(index + 1).padStart(2, '0'),
    title: spec.title,
    opinion: spec.opinion,
    keywords: spec.keywords,
    left: resolve(spec.left, bySlug),
    right: resolve(spec.right, bySlug),
    finishes: (spec.finishes ?? []).map(f => ({
      name: f.name,
      left: imageUrl(spec.left.dir, f.left),
      right: imageUrl(spec.right.dir, f.right),
    })),
    colorNote: Boolean(spec.colorNote),
  }));
}

export function getNurserySets(): NurserySet[] {
  const bySlug = itemsBySlug();
  return SET_SPECS.map(spec => {
    const pieces = spec.pieces.map(p => resolve(p, bySlug, 1));
    return {
      id: spec.id,
      title: spec.title,
      note: spec.note,
      pieces,
      fromTotal: pieces.reduce((sum, p) => sum + p.item.price, 0),
    };
  });
}
