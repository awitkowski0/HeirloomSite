import rooms from '@/data/room-images.json';

/*
 * Owner-approved room photographs: AI edits that place a real catalogue photo
 * of the piece in a nursery. Imported by scripts/import-room-images.mjs.
 *
 * For display on the site only. Never add these to the Merchant feed, Product
 * JSON-LD or og:image: Google treats a product image that is not a photo of
 * the product as it is sold as misrepresentation. They are deliberately kept
 * out of inventory.json, which is what those three read, and
 * tests/room-images-exclusion.test.ts enforces it.
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
