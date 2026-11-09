/*
 * Same-position close-ups, cut from the catalogue frames by CSS.
 *
 * Only pieces whose frames were checked by hand, and only regions clear of
 * anything inside the crib. These show shape. They are not evidence of joinery
 * and must not be captioned as if they were.
 */
export interface DetailCrops {
  image: string;
  size: readonly [number, number];
  crops: readonly { label: string; box: readonly [number, number, number, number] }[];
}

const MACKENZIE = {
  size: [1120, 928] as const,
  crops: [
    { label: 'Head', box: [430, 206, 730, 431] as const },
    { label: 'Rail', box: [560, 300, 880, 540] as const },
    { label: 'Foot', box: [740, 620, 916, 752] as const },
  ],
};

export const DETAIL_CROPS: Readonly<Record<string, DetailCrops>> = {
  'mackenzie-crib-slat-back': {
    ...MACKENZIE,
    image: '/data/products/Mackenzie%20Crib%20(Slat%20Back)/mackenzie_crib_slat_back_1.jpg',
  },
  'mackenzie-crib-panel-back': {
    ...MACKENZIE,
    image: '/data/products/Mackenzie%20Crib%20(Panel%20Back)/mackenzie_crib_panel_back_1.jpg',
  },
  bloomington: {
    image: '/data/products/Bloomington/bloomington_6.jpg',
    size: [2048, 1779],
    crops: [
      { label: 'Head', box: [430, 192, 1030, 642] },
      { label: 'Rail', box: [1300, 430, 1900, 880] },
      { label: 'Foot', box: [1460, 1290, 1900, 1620] },
    ],
  },
};
