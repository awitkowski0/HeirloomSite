import type { InventoryItem } from '@/types';
import type { ProductIndexItem } from './content';
import { SHIPPABLE_STATE_CODES, deliveryChargeFor } from './order-terms';
import { fromCents, toCents } from './format';

/**
 * Canonical origin. Server-only values are fine here: sitemap.ts, robots.ts and
 * every generateMetadata call run on the server.
 *
 * Public SEO must always use the brand host. NEXT_PUBLIC_SITE_URL may override
 * only when it is a real custom domain — never a *.vercel.app deployment host
 * (Vercel project env has historically pointed at heirloom-site-zeta.vercel.app,
 * which leaked into canonical / og:url / robots / sitemap). Local development
 * still uses localhost when no usable override is set.
 */
export const BRAND_SITE_URL = 'https://heirloomcribsandmore.com';

function isLocalDevelopment(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    (process.env.NODE_ENV !== 'production' &&
      !process.env.VERCEL &&
      !process.env.VERCEL_ENV &&
      !process.env.VERCEL_PROJECT_PRODUCTION_URL)
  );
}

function usablePublicOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.hostname.endsWith('.vercel.app')) return null;
    // Origin only: any path, query or hash in the variable is dropped, because
    // every caller appends its own absolute path to this value.
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export const SITE_URL =
  usablePublicOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
  (isLocalDevelopment() ? 'http://localhost:3000' : BRAND_SITE_URL);

export const SITE_NAME = 'Heirloom Cribs and More';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Google truncates description snippets around 155-160 characters. The
 * metaDescription stored in product.json is the full description paragraph
 * (~900 characters for some products), so this is not optional.
 */
export function truncate(text: string | null | undefined, max = 155): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  // Cut at a word boundary so the snippet does not end mid-word.
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Strips a trailing site-name suffix already baked into product.json titles. */
export function stripSiteSuffix(title: string): string {
  return title.replace(/\s*[—–-]\s*Heirloom Cribs( and More)?\s*$/i, '').trim();
}

export function priceRange(configurations: InventoryItem[]): { low: number; high: number } {
  const prices = configurations.flatMap(c =>
    c.stains.length > 0
      ? c.stains.map(s => c.basePrice + (s.priceAddition || 0))
      : [c.basePrice]
  );
  return { low: Math.min(...prices), high: Math.max(...prices) };
}

/**
 * Serialise JSON-LD for injection into a <script> block.
 *
 * `JSON.stringify` does not escape `<`, so a value containing the literal
 * `</script>` closes the block early and everything after it is parsed as
 * markup. Nothing request-derived reaches these sinks today - the inputs are
 * build-time catalogue files - so this is a trust boundary rather than a live
 * hole, but the catalogue copy is re-imported from a supplier feed and the
 * boundary is one line wide.
 *
 * The three escapes stay valid JSON, so consumers parse them identically.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

interface JsonLd {
  '@context': string;
  [key: string]: unknown;
}

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/logo-wide.png'),
    description:
      'Heirloom builds solid hardwood nursery furniture that meets or exceeds CPSC and ASTM ' +
      'safety standards, forest to family, with white-glove delivery and finishes built to ' +
      'grow with your child.',
  };
}

export function webSiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Furniture builders, keyed by the SKU prefix (OTO-1201, FQP-301, KC-10).
 *
 * Handling windows (JSON-LD and the Merchant Center feed) and the feed's
 * `g:brand` both read this table, so a new builder is one row. Kids Comfort
 * is already here for when those pieces land in the catalogue. The store
 * name is never a brand — Google Shopping would treat every builder as one
 * manufacturer.
 */
export const BUILDERS = {
  OTO: { name: 'Old Town Oak', handling: { minValue: 30, maxValue: 40 } },
  FQP: { name: 'Fisher', handling: { minValue: 50, maxValue: 70 } },
  KC: { name: 'Kids Comfort', handling: { minValue: 40, maxValue: 40 } },
} as const;

export type BuilderCode = keyof typeof BUILDERS;

/** First token of a SKU (`OTO`, `FQP`, `KC`), or null when it is not a builder. */
export function skuBuilderCode(sku: string | null | undefined): BuilderCode | null {
  const prefix = (sku ?? '').trim().split(/[\s-]/, 1)[0]?.toUpperCase() ?? '';
  return prefix in BUILDERS ? (prefix as BuilderCode) : null;
}

/** Builder display name for a SKU, or null. Never the store name. */
export function builderBrand(sku: string | null | undefined): string | null {
  const code = skuBuilderCode(sku);
  return code ? BUILDERS[code].name : null;
}

/**
 * Handling time in business days, from the builder prefix on the SKU.
 *
 * A SKU with no furniture-builder prefix (rugs, lamps) keeps the previous
 * six-to-eight week window. Google reads unitCode DAY as business days.
 */
export function handlingBusinessDays(
  sku: string | null | undefined
): { minValue: number; maxValue: number } {
  const code = skuBuilderCode(sku);
  return code ? BUILDERS[code].handling : { minValue: 42, maxValue: 56 };
}

/**
 * Curbside charge for a product's price, in cents. Falls back to the $175
 * floor when the price is missing.
 */
export function productShippingCents(priceDollars: number): number {
  if (!Number.isFinite(priceDollars) || priceDollars < 0) return deliveryChargeFor(0, 'threshold');
  return deliveryChargeFor(toCents(priceDollars), 'threshold');
}

/** The returns page `hasMerchantReturnPolicy` points at. */
export const RETURNS_PATH = '/returns';

/**
 * schema.org MerchantReturnPolicy for the made-to-order furniture.
 *
 * /returns: "Made-to-order case goods cannot be returned, exchanged or
 * refunded." That is MerchantReturnNotPermitted, so the policy carries no
 * return window, fees or method - there is no return to describe. Delivery is
 * US only (PA, NJ, MD), hence applicableCountry US.
 */
export function merchantReturnPolicyJsonLd(): Record<string, unknown> {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'US',
    returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    merchantReturnLink: absoluteUrl(RETURNS_PATH),
  };
}

/**
 * Product JSON-LD for one product page: the base page or one wood/finish page.
 *
 * Exactly one Offer, for the configuration the page renders and at the price
 * the page shows (`price-current`), so the markup describes what this URL
 * sells rather than the whole product family. A colour page is its own
 * product: its name carries the colour, `sku` is that colour's SKU (the same
 * value the Merchant Center feed sends as `g:id`) and `url` / `offers.url`
 * are the page's own canonical URL.
 *
 * `brand` is the furniture builder, from the same BUILDERS table the feed's
 * `g:brand` reads; Heirloom is the seller, not the manufacturer. A SKU with no
 * builder prefix (rugs, lamps) keeps the store name, as before.
 *
 * Deliberately absent: aggregateRating / review (there are none), gtin (the
 * builders publish none), mpn (the SKU is the store's code, not a confirmed
 * manufacturer part number), priceValidUntil (prices have no end date) and
 * transitTime (the site quotes a handling window only).
 */
export function productJsonLd(opts: {
  /** Display name for this page: "Newport Crib", or "Newport Crib in Carbon" on a colour page. */
  name: string;
  /** Canonical path of THIS page (`/product/newport-crib/carbon`). */
  path: string;
  description: string;
  images: string[];
  /** SKU of the configuration this page renders. */
  sku: string | null;
  /** The price this page displays, in dollars. */
  priceDollars: number;
  inStock: boolean;
}): JsonLd {
  const sku = opts.sku || null;
  const handling = handlingBusinessDays(sku);
  const url = absoluteUrl(opts.path);
  const brand = builderBrand(sku) ?? SITE_NAME;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    image: opts.images.map(absoluteUrl),
    ...(sku ? { sku } : {}),
    brand: { '@type': 'Brand', name: brand },
    url,
    offers: {
      '@type': 'Offer',
      url,
      price: opts.priceDollars,
      priceCurrency: 'USD',
      /*
       * The furniture is made to order. Handling time is the builder's window
       * in business days, so the markup does not imply the piece is on a shelf.
       *
       * schema.org/MadeToOrder would be the literal term, but Google does not
       * support it in the `availability` enum (BackOrder, Discontinued,
       * InStock, InStoreOnly, LimitedAvailability, OnlineOnly, OutOfStock,
       * PreOrder, PreSale, SoldOut). InStock remains correct - the item IS
       * orderable - so the lead time is expressed where Google actually reads
       * it, as handling time.
       */
      availability: opts.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      /*
       * shippingRate is the Curbside charge for this page's price, not a flat
       * figure and not 0. Advertising free shipping and then charging for
       * delivery is a promise we would not keep. A multi-item cart can land in
       * a higher band at checkout, where the charge is recomputed from the
       * cart. A missing price falls back to the $175 Curbside floor. See
       * deliveryChargeFor in src/lib/order-terms.ts. Same rate the feed sends.
       */
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: fromCents(productShippingCents(opts.priceDollars)),
          currency: 'USD',
        },
        // US regions PA, NJ, MD — the same list checkout delivers to.
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'US',
          addressRegion: [...SHIPPABLE_STATE_CODES],
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: handling.minValue,
            maxValue: handling.maxValue,
            unitCode: 'DAY',
            unitText: 'business days',
          },
        },
      },
      hasMerchantReturnPolicy: merchantReturnPolicyJsonLd(),
    },
  };
}

export function breadcrumbJsonLd(
  trail: Array<{ name: string; path: string }>
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemListJsonLd(products: ProductIndexItem[], basePath: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.productName,
      url: absoluteUrl(`/product/${p.slug}`),
    })),
    url: absoluteUrl(basePath),
  };
}

/**
 * FAQPage structured data.
 *
 * Answers arrive as already-rendered React nodes rather than as a second copy
 * of the prose: schema.org wants plain text and the page wants markup, and a
 * hand-maintained plain-text twin of twenty answers drifts from the visible
 * copy the first time someone edits one and not the other. Google penalises
 * FAQ markup that disagrees with the page, so the two must come from one
 * source - see nodeTextCompact in src/lib/node-text.ts.
 */
export function faqPageJsonLd(entries: { question: string; answerText: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(e => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.answerText },
    })),
  };
}
