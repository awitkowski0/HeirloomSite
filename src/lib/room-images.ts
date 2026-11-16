import rooms from '@/data/room-images.json';

/*
 * Owner-approved room photographs, from scripts/import-room-images.mjs.
 * For display on the site only: never add these to a Merchant feed, Product
 * JSON-LD or og:image. tests/room-images-exclusion.test.ts enforces it.
 */
export interface RoomImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

const ROOM_IMAGES = rooms as unknown as Readonly<Record<string, RoomImage[]>>;

export function roomImagesFor(slug: string): RoomImage[] {
  return ROOM_IMAGES[slug] ?? [];
}

export function roomProductSlugs(): string[] {
  return Object.keys(ROOM_IMAGES);
}
