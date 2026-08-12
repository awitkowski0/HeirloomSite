export interface GalleryStain {
  name: string;
  image?: string;
  priceAddition: number;
  inStock: boolean;
}

export interface GalleryProduct {
  slug: string;
  name: string;
  minPrice: number;
  woods: string[];
  /** wood -> its stains */
  woodStains: Record<string, GalleryStain[]>;
  /** wood -> base price for that wood */
  woodPrices: Record<string, number>;
}
