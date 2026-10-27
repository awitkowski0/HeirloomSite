import type { InventoryItem } from '@/types';
import { getBrowsableProducts, getInventory } from './content';
import { pickDefaultImage } from './images';
import { variantLabel } from './labels';
import { SHIPPABLE_STATE_CODES, deliveryChargeFor } from './order-terms';
import { toCents } from './format';
import {
  BRAND_SITE_URL,
  SITE_NAME,
  builderBrand,
  handlingBusinessDays,
  stripSiteSuffix,
} from './seo';
import { variantHref } from './variants';

/**
 * Google Merchant Center product feed.
 *
 * One <item> per sellable crib and case-good variant. Kits, rails, the
 * mattress, rugs and lamps stay out: they are not the furniture Google
 * Shopping is being asked to advertise. Hidden products never reach
 * inventory (scripts/build-data.mjs), and unlisted accessories are not in
 * getBrowsableProducts — the same cut sitemap.ts uses.
 */

const FEED_CATEGORIES = new Set([
  'Cribs',
  'Mini Cribs',
  'Dressers',
  'Chests',
  'Nightstands',
  'Changing Tables',
]);

export const FEED_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
} as const;

/** Wood/finish suffix on a variant SKU (`OTO-1201-BrownMaple_OCS_100_Natural`). */
const VARIANT_SKU_SUFFIX = /-(?:BrownMaple|CherryWood|RedOak)_.+$/i;

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Google's `g:price` / `g:shipping` amount: `"123.00 USD"`. */
export function merchantPrice(cents: number): string {
  const n = Math.max(0, Math.round(cents));
  const dollars = Math.floor(n / 100);
  const frac = String(n % 100).padStart(2, '0');
  return `${dollars}.${frac} USD`;
}

/** `g:item_group_id`: the product SKU, with a wood/finish suffix stripped. */
export function itemGroupId(sku: string): string {
  return sku.replace(VARIANT_SKU_SUFFIX, '');
}

function brandUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BRAND_SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function el(name: string, value: string): string {
  return `      <${name}>${xmlEscape(value)}</${name}>`;
}

export function itemPriceDollars(item: InventoryItem): number {
  const stain = item.stains.find(s => s.inStock !== false) ?? item.stains[0];
  return item.basePrice + (stain?.priceAddition || 0);
}

function itemTitle(item: InventoryItem): string {
  const base = stripSiteSuffix(item.title || item.productName);
  if (item.variantType === 'none') return base;
  const label = variantLabel(item.wood, '').replace(' • ', ', ');
  return label ? `${item.productName} in ${label}` : base;
}

function itemDescription(item: InventoryItem): string {
  const raw = item.description || item.metaDescription || item.productName;
  return raw.replace(/\s+/g, ' ').trim().slice(0, 5000);
}

function itemLink(item: InventoryItem): string {
  const wood = item.variantType === 'none' ? null : item.wood;
  return brandUrl(variantHref(item.slug ?? '', wood));
}

function isInStock(item: InventoryItem): boolean {
  return item.stains.some(s => s.inStock !== false);
}

export function browsableInventory(): InventoryItem[] {
  const browsable = new Set(getBrowsableProducts().map(p => p.slug));
  return getInventory().filter(item => item.slug && browsable.has(item.slug));
}

export function feedItems(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.filter(item => {
    if (!item.slug || !item.sku) return false;
    if (!item.category || !FEED_CATEGORIES.has(item.category)) return false;
    if (!builderBrand(item.sku)) return false;
    if (!pickDefaultImage(item.stains)) return false;
    return true;
  });
}

function renderItem(item: InventoryItem): string {
  const sku = item.sku;
  const brand = sku ? builderBrand(sku) : null;
  const image = pickDefaultImage(item.stains);
  if (!sku || !brand || !image) return '';
  const priceDollars = itemPriceDollars(item);
  const priceCents = toCents(priceDollars);
  const price = merchantPrice(priceCents);
  const shipping = merchantPrice(deliveryChargeFor(priceCents, 'threshold'));
  const handling = handlingBusinessDays(sku);
  const shippingBlocks = SHIPPABLE_STATE_CODES.map(
    region =>
      `      <g:shipping>\n` +
      `        <g:country>${xmlEscape('US')}</g:country>\n` +
      `        <g:region>${xmlEscape(region)}</g:region>\n` +
      `        <g:price>${xmlEscape(shipping)}</g:price>\n` +
      `      </g:shipping>`
  ).join('\n');

  return [
    '    <item>',
    el('g:id', sku),
    el('g:item_group_id', itemGroupId(sku)),
    el('g:title', itemTitle(item)),
    el('g:description', itemDescription(item)),
    el('g:link', itemLink(item)),
    el('g:image_link', brandUrl(image)),
    el('g:price', price),
    el('g:availability', isInStock(item) ? 'in_stock' : 'out_of_stock'),
    el('g:condition', 'new'),
    el('g:brand', brand),
    el('g:identifier_exists', 'no'),
    shippingBlocks,
    el('g:min_handling_time', String(handling.minValue)),
    el('g:max_handling_time', String(handling.maxValue)),
    '    </item>',
  ].join('\n');
}

export function merchantFeedXml(inventory: InventoryItem[] = browsableInventory()): string {
  const items = feedItems(inventory);
  const body = items.map(renderItem).join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `  <channel>\n` +
    `    <title>${xmlEscape(SITE_NAME)}</title>\n` +
    `    <link>${xmlEscape(BRAND_SITE_URL)}</link>\n` +
    `    <description>${xmlEscape('Solid hardwood cribs and nursery furniture.')}</description>\n` +
    `${body}\n` +
    `  </channel>\n` +
    `</rss>\n`
  );
}
