/**
 * Redirects for URLs left behind by the retired Shopify storefront.
 *
 * Kept as plain data (no imports) so next.config.ts can spread it into its
 * redirects() list and tests/shopify-redirects.test.ts can assert every row.
 * The existing redirects in next.config.ts (the production-only *.vercel.app
 * rule, /gallery, the retired /products/<category> slugs, /products?search=)
 * are untouched and defined there, not here.
 *
 * Targets reconciled across three sources: the Merchant Center GSC 404 audit
 * (redirect-map-2026-10-26.csv, the authority for the 46 URLs Google actually
 * reported), the CoS Shopify sweep handle list (handles-62.tsv) and REPORT.md
 * (the other old Shopify URL shapes, probed live). Where the sources disagreed,
 * the true-equivalent (usually SKU-matched) target won; those are flagged in the
 * PR body.
 *
 * Status choice:
 *   - permanent (308) where the destination is a confirmed TRUE equivalent;
 *   - temporary (307) where the target is only the closest live page, not a
 *     true equivalent, so it is not cached and can change later;
 *   - 410 Gone for the withdrawn area-rug product (SHOPIFY_GONE_PATHS);
 *   - URLs with no equivalent at all are NOT listed here and keep returning 404
 *     on purpose (see the PR body): the two "weak" FQP conversion-kit handles
 *     and the old-store system URLs.
 *
 * Hosts: every source is path-only, so Next matches it on whatever host serves
 * the deployment (apex heirloomcribsandmore.com and www alike). Query strings
 * (?variant=, ?_pos=&_sid=&_ss=) are ignored for matching; the destinations
 * below are clean paths with no query of their own.
 */
export interface ShopifyRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

/*
 * 60 old /products/<handle> URLs with a confirmed equivalent (308): exact,
 * strong or SKU-matched, plus the three guard-rail/bed-rail handles at the end,
 * which were 307 "candidates" until Phil confirmed them (decision a1).
 */
export const SHOPIFY_PRODUCT_REDIRECTS_PERMANENT: ShopifyRedirect[] = [
  { source: '/products/mission-style', destination: '/product/mission', permanent: true },
  { source: '/products/arched-top', destination: '/product/arched-top', permanent: true },
  { source: '/products/bloomington-style', destination: '/product/bloomington', permanent: true },
  { source: '/products/darlington-style', destination: '/product/darlington', permanent: true },
  { source: '/products/hudson-style', destination: '/product/hudson', permanent: true },
  { source: '/products/moyerton-style', destination: '/product/moyerton', permanent: true },
  { source: '/products/princeton-style', destination: '/product/princeton', permanent: true },
  { source: '/products/changing-table-6-drawer', destination: '/product/changing-table-6-drawer', permanent: true },
  { source: '/products/nightstand-2-drawer', destination: '/product/nightstand-2-drawer', permanent: true },
  { source: '/products/oto-280-crib-mattress', destination: '/product/crib-mattress', permanent: true },
  { source: '/products/french-country-crib-slat-style-front', destination: '/product/french-country-crib-slat-style-front', permanent: true },
  { source: '/products/french-country-crib-panel-style-front', destination: '/product/french-country-crib-panel-style-front', permanent: true },
  { source: '/products/french-country-3-drawer-nightstand', destination: '/product/french-country-3-drawer-nightstand', permanent: true },
  { source: '/products/french-country-4-drawer-dresser', destination: '/product/french-country-4-drawer-dresser', permanent: true },
  { source: '/products/french-country-4-drawer-dresser-with-changing-table', destination: '/product/french-country-4-drawer-dresser-with-changing-table', permanent: true },
  { source: '/products/french-country-3-drawer-dresser-with-door', destination: '/product/french-country-3-drawer-dresser-with-door', permanent: true },
  { source: '/products/french-country-3-drawer-dresser-with-door-and-changing-table', destination: '/product/french-country-3-drawer-dresser-with-door-and-changing-table', permanent: true },
  { source: '/products/french-country-6-drawer-dresser', destination: '/product/french-country-6-drawer-dresser', permanent: true },
  { source: '/products/french-country-6-drawer-dresser-with-hutch-top', destination: '/product/french-country-6-drawer-dresser-with-hutch-top', permanent: true },
  { source: '/products/french-country-6-drawer-dresser-with-changing-table', destination: '/product/french-country-6-drawer-dresser-with-changing-table', permanent: true },
  { source: '/products/french-country-7-drawer-dresser-with-top-mirror', destination: '/product/french-country-7-drawer-dresser-with-top-mirror', permanent: true },
  { source: '/products/french-country-7-drawer-dresser-with-changing-table', destination: '/product/french-country-7-drawer-dresser-with-changing-table', permanent: true },
  { source: '/products/french-country-chest', destination: '/product/french-country-chest', permanent: true },
  { source: '/products/addison-crib', destination: '/product/addison-crib', permanent: true },
  { source: '/products/addison-crib-raised-panel', destination: '/product/addison-crib-with-raised-panel-headboard', permanent: true },
  { source: '/products/addison-3-drawer-nightstand', destination: '/product/addison-3-drawer-nightstand', permanent: true },
  { source: '/products/addison-6-drawer-dresser', destination: '/product/addison-6-drawer-dresser', permanent: true },
  { source: '/products/addison-7-drawer-dresser', destination: '/product/addison-7-drawer-dresser', permanent: true },
  { source: '/products/addison-chest-dresser', destination: '/product/addison-chest-dresser', permanent: true },
  { source: '/products/newport-crib', destination: '/product/newport-crib', permanent: true },
  { source: '/products/newport-nightstand', destination: '/product/newport-nightstand', permanent: true },
  { source: '/products/newport-4-drawer-chest', destination: '/product/newport-4-drawer-chest', permanent: true },
  { source: '/products/mackenzie-crib-slat-back', destination: '/product/mackenzie-crib-slat-back', permanent: true },
  { source: '/products/mackenzie-crib-panel-back', destination: '/product/mackenzie-crib-panel-back', permanent: true },
  { source: '/products/mackenzie-nightstand', destination: '/product/mackenzie-nightstand', permanent: true },
  { source: '/products/newport-7-drawer-dresser', destination: '/product/newport-7-drawer-dresser', permanent: true },
  { source: '/products/west-lake-crib', destination: '/product/west-lake-crib', permanent: true },
  { source: '/products/mackenzie-6-drawer-dresser', destination: '/product/mackenzie-6-drawer-dresser', permanent: true },
  { source: '/products/west-lake-3-drawer-nightstand', destination: '/product/west-lake-3-drawer-nightstand', permanent: true },
  { source: '/products/mackenzie-7-drawer-dresser', destination: '/product/mackenzie-7-drawer-dresser', permanent: true },
  { source: '/products/west-lake-4-drawer-dresser', destination: '/product/west-lake-4-drawer-dresser', permanent: true },
  { source: '/products/mini-newport', destination: '/product/mini-newport-with-mattress', permanent: true },
  { source: '/products/west-lake-6-drawer-dresser', destination: '/product/west-lake-6-drawer-dresser', permanent: true },
  { source: '/products/mackenzie-chest', destination: '/product/mackenzie-chest', permanent: true },
  { source: '/products/west-lake-7-drawer-dresser', destination: '/product/west-lake-7-drawer-dresser', permanent: true },
  { source: '/products/west-lake-chest', destination: '/product/west-lake-chest', permanent: true },
  { source: '/products/addison-toddler-bed', destination: '/product/addison-toddler-bed', permanent: true },
  { source: '/products/addison-full-bed-rail-kit', destination: '/product/addison-full-bed-rail-kit', permanent: true },
  { source: '/products/newport-toddler-bed', destination: '/product/newport-toddler-bed', permanent: true },
  { source: '/products/newport-full-bed-rail-kit', destination: '/product/newport-full-bed-rail-kit', permanent: true },
  { source: '/products/mackenzie-toddler-bed', destination: '/product/mackenzie-toddler-bed', permanent: true },
  { source: '/products/mackenzie-full-bed-rail-kit', destination: '/product/mackenzie-full-bed-rail-kit', permanent: true },
  { source: '/products/west-lake-toddler-bed', destination: '/product/west-lake-toddler-bed', permanent: true },
  { source: '/products/west-lake-full-bed-rail-kit', destination: '/product/west-lake-full-bed-rail-kit', permanent: true },
  { source: '/products/full-guard-rail', destination: '/product/full-guard-rail', permanent: true },
  { source: '/products/oto-401a-toddler-rail', destination: '/product/toddler-conversion-rail', permanent: true },
  { source: '/products/oto-490-guard-rail', destination: '/product/guard-rail', permanent: true },
  // Confirmed by Phil (decision a1): promoted from 307 to 308.
  { source: '/products/oto-401b-bed-rail', destination: '/product/full-bed-rail-kit', permanent: true },
  { source: '/products/oto-475-3-4-guard-rail', destination: '/product/34-guard-rail', permanent: true },
  { source: '/products/three-quarter-guard-rail', destination: '/product/34-guard-rail', permanent: true },
];



/*
 * Topic 2: old Shopify pages/policies/collections/cart that have a TRUE
 * equivalent on the new site -> permanent 308. Targets verified to return 200:
 * /safety /contact /faq /care /privacy /returns /shipping /terms /products
 * /products/cribs /collections/newport /checkout. (/care is the furniture-care
 * page; /collections/newport is the Newport range page; /checkout is the Vercel
 * cart. The Merchant map's newport-collection -> /collections/newport is here;
 * the app's own -style-collection logic in collections.ts handles the rest.)
 */
export const SHOPIFY_PAGE_REDIRECTS_PERMANENT: ShopifyRedirect[] = [
  { source: '/pages/safety', destination: '/safety', permanent: true },
  { source: '/pages/contact', destination: '/contact', permanent: true },
  { source: '/pages/faq', destination: '/faq', permanent: true },
  { source: '/pages/caring-for-your-custom-wood-furniture', destination: '/care', permanent: true },
  { source: '/policies/refund-policy', destination: '/returns', permanent: true },
  { source: '/policies/privacy-policy', destination: '/privacy', permanent: true },
  { source: '/policies/shipping-policy', destination: '/shipping', permanent: true },
  { source: '/policies/terms-of-service', destination: '/terms', permanent: true },
  { source: '/collections/all', destination: '/products', permanent: true },
  { source: '/collections/frontpage', destination: '/products', permanent: true },
  { source: '/collections/baby-cribs', destination: '/products/cribs', permanent: true },
  { source: '/collections/newport-collection', destination: '/collections/newport', permanent: true },
  { source: '/cart', destination: '/checkout', permanent: true },
];

/*
 * Topic 2, 307 (closest live page, not a true equivalent, so NOT cached and
 * reversible):
 *   - /pages/about-us -> / : there is no /about page, so per Phil it goes to
 *     the homepage;
 *   - /pages/data-sharing-opt-out -> /privacy : Merchant medium-confidence match
 *     (the privacy page does carry the opt-out section);
 *   - /pages/my-journey -> / : the old founder-story page; like about-us there
 *     is no about page on the site yet, so the homepage is the closest (decision c1);
 *   - /collections/box-tops -> /products/dressers-changing-tables : box tops
 *     are the changing-table tops that sit on a dresser; that category is the
 *     nearest live listing, though no standalone box top is sold (decision c1).
 * Left as 404 on purpose (see the PR body): the two weak FQP kit handles and the
 * old-store system URLs (/password, /v1/produce, /services/login_with_shop/*,
 * /customer_authentication/login, /account*, /blogs*). The withdrawn rug is a
 * 410, see SHOPIFY_GONE_PATHS below.
 */
export const SHOPIFY_PAGE_REDIRECTS_TEMPORARY: ShopifyRedirect[] = [
  { source: '/pages/about-us', destination: '/', permanent: false },
  { source: '/pages/data-sharing-opt-out', destination: '/privacy', permanent: false },
  { source: '/pages/my-journey', destination: '/', permanent: false },
  { source: '/collections/box-tops', destination: '/products/dressers-changing-tables', permanent: false },
];

/*
 * Old URLs for products that are withdrawn for good: they answer 410 Gone (with
 * noindex) so Google drops them, instead of a 404 it keeps re-crawling
 * (decision b1). redirects() cannot return a 410, so next.config.ts rewrites
 * each path to the tiny route handler at src/app/gone/route.ts, which does.
 */
export const SHOPIFY_GONE_PATHS: string[] = [
  // Lorena Canals Woolable "Sheep of the World - Tundra" area rug (withdrawn,
  // `hidden: true` in its product.json).
  '/products/woolable-sheep-of-the-world-tundra-washable-wool-hand-tufted-non-slip-backing-area-rug-blended-sheep-beige',
];

/** Internal path every gone URL is rewritten to (see src/app/gone/route.ts). */
export const GONE_ROUTE = '/gone';

/** Every Shopify-leftover redirect, in one list for next.config.ts and tests. */
export const SHOPIFY_REDIRECTS: ShopifyRedirect[] = [
  ...SHOPIFY_PRODUCT_REDIRECTS_PERMANENT,
  ...SHOPIFY_PAGE_REDIRECTS_PERMANENT,
  ...SHOPIFY_PAGE_REDIRECTS_TEMPORARY,
];
