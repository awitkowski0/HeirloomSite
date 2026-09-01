import type { InventoryItem } from '@/types';
import type { ProductIndexItem } from './content';
import { SHIPPABLE_STATE_CODES, cheapestShippingCents } from './order-terms';
import { fromCents } from './format';

/**
 * Canonical origin. Server-only values are fine here: sitemap.ts, robots.ts and
 * every generateMetadata call run on the server.
 *
 * VERCEL_PROJECT_PRODUCTION_URL is a bare host with no scheme.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/+$/, '');

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

export function productJsonLd(opts: {
  productName: string;
  slug: string;
  description: string;
  images: string[];
  sku: string | null;
  configurations: InventoryItem[];
}): JsonLd {
  const { low, high } = priceRange(opts.configurations);
  const anyInStock = opts.configurations.some(c => c.stains.some(s => s.inStock !== false));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.productName,
    description: opts.description,
    image: opts.images.map(absoluteUrl),
    ...(opts.sku ? { sku: opts.sku } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    url: absoluteUrl(`/product/${opts.slug}`),
    // Most products have several wood variants at different prices, so a single
    // Offer would misreport the price. AggregateOffer is the honest shape.
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: low,
      highPrice: high,
      offerCount: opts.configurations.length,
      availability: anyInStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      /*
       * The furniture is made to order with a six-to-eight week lead time, and
       * until now nothing in the markup said so - the page promised one thing
       * and the structured data implied stock on a shelf.
       *
       * schema.org/MadeToOrder would be the literal term, but Google does not
       * support it in the `availability` enum (BackOrder, Discontinued,
       * InStock, InStoreOnly, LimitedAvailability, OnlineOnly, OutOfStock,
       * PreOrder, PreSale, SoldOut). InStock remains correct - the item IS
       * orderable - so the lead time is expressed where Google actually reads
       * it, as handling time.
       *
       * shippingRate is the CHEAPER of the two delivery tiers, not 0. It said
       * 0 while the site believed delivery was included; advertising free
       * shipping in structured data and then charging $685 at checkout is the
       * kind of mismatch Google issues merchant listing penalties for, and it
       * is a promise to a customer we would not keep. See SHIPPING_METHODS in
       * src/lib/order-terms.ts.
       */
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: fromCents(cheapestShippingCents()),
          currency: 'USD',
        },
        // The regional route, not the whole country - see SHIPPABLE_STATE_CODES.
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'US',
          addressRegion: [...SHIPPABLE_STATE_CODES],
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 42,
            maxValue: 56,
            unitCode: 'DAY',
          },
        },
      },
      url: absoluteUrl(`/product/${opts.slug}`),
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
