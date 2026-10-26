/**
 * Redirects for URLs left behind by the retired Shopify storefront.
 *
 * Kept as plain data (no imports) so next.config.ts can spread it into its
 * redirects() list and tests/shopify-redirects.test.ts can assert every row.
 * The existing redirects in next.config.ts (the production-only *.vercel.app
 * rule, /gallery, the retired /products/<category> slugs, /products?search=)
 * are untouched and defined there, not here.
 *
 * Status choice:
 *   - permanent (308) only where the destination is a TRUE equivalent of the
 *     old page (the same product);
 *   - temporary (307) where the destination is reasonable but unconfirmed (the
 *     "candidate" product matches below, pending Phil's review), so it is not
 *     cached and can be promoted to 308 once confirmed;
 *   - URLs with no true equivalent are NOT listed here and keep returning 404
 *     on purpose (see the PR body): the two "weak" FQP conversion-kit handles, plus /pages/my-journey,
 *     /collections/newport-collection, /collections/box-tops, the discontinued
 *     area-rug product and the Shopify system URLs.
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

/* 55 old /products/<handle> URLs with an exact or strong equivalent (308). */
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
];

/*
 * 5 "candidate" /products/<handle> URLs. The target is the most likely match
 * and returns 200, but the mapping is pending Phil's confirmation, so it is a
 * 307 (not cached) and can be promoted to 308 once confirmed.
 */
export const SHOPIFY_PRODUCT_REDIRECTS_CANDIDATE: ShopifyRedirect[] = [
  { source: '/products/oto-401a-toddler-rail', destination: '/product/toddler-conversion-rail', permanent: false },
  { source: '/products/oto-401b-bed-rail', destination: '/product/full-bed-rail-kit', permanent: false },
  { source: '/products/oto-475-3-4-guard-rail', destination: '/product/34-guard-rail', permanent: false },
  { source: '/products/oto-490-guard-rail', destination: '/product/full-guard-rail', permanent: false },
  { source: '/products/three-quarter-guard-rail', destination: '/product/34-guard-rail', permanent: false },
];


/*
 * Topic 2: old Shopify pages/policies/collections/cart that have a TRUE
 * equivalent on the new site -> permanent 308. Targets verified to return 200:
 * /safety /contact /faq /care /privacy /returns /shipping /terms /products
 * /products/cribs /checkout. (/privacy covers the data-sharing opt-out; /care is
 * the furniture-care page; /checkout is the Vercel cart.)
 */
export const SHOPIFY_PAGE_REDIRECTS_PERMANENT: ShopifyRedirect[] = [
  { source: '/pages/safety', destination: '/safety', permanent: true },
  { source: '/pages/contact', destination: '/contact', permanent: true },
  { source: '/pages/faq', destination: '/faq', permanent: true },
  { source: '/pages/caring-for-your-custom-wood-furniture', destination: '/care', permanent: true },
  { source: '/pages/data-sharing-opt-out', destination: '/privacy', permanent: true },
  { source: '/policies/refund-policy', destination: '/returns', permanent: true },
  { source: '/policies/privacy-policy', destination: '/privacy', permanent: true },
  { source: '/policies/shipping-policy', destination: '/shipping', permanent: true },
  { source: '/policies/terms-of-service', destination: '/terms', permanent: true },
  { source: '/collections/all', destination: '/products', permanent: true },
  { source: '/collections/frontpage', destination: '/products', permanent: true },
  { source: '/collections/baby-cribs', destination: '/products/cribs', permanent: true },
  { source: '/cart', destination: '/checkout', permanent: true },
];

/*
 * Topic 2: /pages/about-us has no true equivalent (there is no /about page), so
 * per Phil it goes to the homepage as a NON-cached 307 rather than a 308.
 * Everything else with no equivalent is left as 404 (see the PR body):
 * /pages/my-journey, /collections/newport-collection, /collections/box-tops, the
 * discontinued area-rug product, and the Shopify system URLs (/password,
 * /v1/produce, /services/login_with_shop/*, /customer_authentication/login,
 * /account*, /blogs*).
 */
export const SHOPIFY_PAGE_REDIRECTS_TEMPORARY: ShopifyRedirect[] = [
  { source: '/pages/about-us', destination: '/', permanent: false },
];

/** Every Shopify-leftover redirect, in one list for next.config.ts and tests. */
export const SHOPIFY_REDIRECTS: ShopifyRedirect[] = [
  ...SHOPIFY_PRODUCT_REDIRECTS_PERMANENT,
  ...SHOPIFY_PRODUCT_REDIRECTS_CANDIDATE,
  ...SHOPIFY_PAGE_REDIRECTS_PERMANENT,
  ...SHOPIFY_PAGE_REDIRECTS_TEMPORARY,
];
