import 'server-only';

/**
 * Per-collection intro copy. Only collections with a CoS-passed brief live
 * here; every other collection keeps the generic title, meta, H1 and one-line
 * intro in the collection page.
 *
 * French Country strings are Brand 6880248924 / Director PASS 6886534417 /
 * CoS QC PASS 6886551976, verbatim.
 */

export interface CollectionIntroLink {
  label: string;
  href: string;
}

export interface CollectionIntro {
  /** Full document title, including " | Heirloom Cribs & More". */
  title: string;
  metaDescription: string;
  h1: string;
  introParagraphs: readonly string[];
  links: readonly CollectionIntroLink[];
}

export const FRENCH_COUNTRY_INTRO: CollectionIntro = {
  title: 'French Country Cribs and Dressers | Heirloom Cribs & More',
  metaDescription:
    'French Country cribs, dressers, a chest and a nightstand from Old Town Oak, made to order in brown maple. Delivered in PA, NJ and MD.',
  h1: 'French Country Nursery Collection',
  introParagraphs: [
    'The French Country collection is made to order by Old Town Oak, a furniture business in Topeka, Indiana, that specializes in baby furniture. Its 13 pieces are designed to sit together in one room: two cribs, nine dressers, a chest and a nightstand.',
    'Choose a 4-in-1 convertible crib with a slat-style or panel-style front. Each converts from a crib to a toddler bed and a full-size bed, and its product page lists the conversion kits you can add to your order. The dressers include versions with a changing table top, a hutch top or a top mirror. Old Town Oak says: "Our dressers feature dovetail wood drawer boxes and full extension slides, all features that make sure our baby furniture will stand the test of time."',
    'On our site, French Country pieces are listed in brown maple. The cribs come in ten stains. Start with the crib, then add a dresser, chest or nightstand from the same collection.',
    'Lead time is about 6 to 8 weeks, confirmed when you order. We deliver in Pennsylvania, New Jersey and Maryland. Shipping is charged based on your cart subtotal, and White Glove is the only delivery service that includes assembly.',
  ],
  links: [
    { label: 'More about Old Town Oak', href: '/builders/old-town-oak' },
    { label: 'How 4-in-1 conversion works', href: '/how-conversion-works' },
    { label: 'Delivery', href: '/shipping' },
  ],
};

const BY_SLUG: Record<string, CollectionIntro> = {
  'french-country': FRENCH_COUNTRY_INTRO,
};

export function getCollectionIntro(slug: string): CollectionIntro | null {
  return BY_SLUG[slug] ?? null;
}
