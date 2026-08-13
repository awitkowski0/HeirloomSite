export interface StainGalleryItem {
  id?: string;
  url: string;
  originalName?: string;
}

export interface Stain {
  name: string;
  inStock: boolean;
  priceAddition: number;
  image?: string;
  gallery?: StainGalleryItem[];
}

export interface Addon {
  name: string;
  description: string | null;
  price: number;
  priceStained: number;
  image: string | null;
  category: string | null;
  stainable: boolean;
}

/**
 * What the `wood` field actually means for a product.
 *
 * One field carries four different things across the catalogue - a wood species,
 * a rug size, a paint/stain finish, or nothing at all ("Default Title", a
 * Shopify export artifact). This used to be guessed at render time by sniffing
 * the string for quote marks; it is now declared in product.json and validated
 * against the data by scripts/build-data.mjs.
 */
export type VariantType = 'wood' | 'size' | 'finish' | 'none';

export interface InventoryItem {
  productName: string;
  wood: string;
  category: string | null;
  variantType: VariantType;
  description: string | null;
  extendedDescription: string | null;
  title: string | null;
  metaDescription: string | null;
  basePrice: number;
  tags: string[];
  sku: string | null;
  slug: string | null;
  dimensions: string | null;
  weight: number | null;
  addons: Addon[];
  stains: Stain[];
}

export interface ImageRecord {
  productName: string;
  wood: string;
  stainName: string | null;
  path: string;
  order?: number;
  altText?: string | null;
  source?: string | null;
}

export interface ShowroomSlide {
  image: string;
  imageMobile?: string;
  productId?: string;
}

export interface ShowroomFeatured {
  productName: string;
  stainName?: string;
}

export interface ShowroomData {
  slides: ShowroomSlide[];
  featured: ShowroomFeatured[];
}

export interface StainType {
  name: string;
  color: string | null;
  defaultPriceAddition: number;
}

export interface AppSettings {
  paymentProvider: string;
}

export interface CartAddon {
  name: string;
  price: number;
  stainName?: string;
}

export interface CartItem {
  id: string;
  productName: string;
  cribName?: string;
  wood: string;
  stainName: string;
  price: number;
  image: string;
  quantity: number;
  addons?: CartAddon[];
}
