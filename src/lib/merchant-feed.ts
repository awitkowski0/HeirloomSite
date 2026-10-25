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

/**
 * `g:google_product_category`, by site category. Exact strings from Google's
 * taxonomy (taxonomy-with-ids.en-US.txt, version 2021-09-21):
 *   6394 Furniture > Baby & Toddler Furniture > Cribs & Toddler Beds
 *    558 Furniture > Baby & Toddler Furniture > Changing Tables
 *   4195 Furniture > Cabinets & Storage > Dressers
 *    462 Furniture > Tables > Nightstands
 * The site's "Chests" are chests of DRAWERS (Mackenzie Chest, West Lake
 * Chest...), which Google files under Dressers. Its "Storage Chests" (4205)
 * are lidded trunks - hope chests, toy chests - and would be wrong here.
 */
export const GOOGLE_PRODUCT_CATEGORY: Readonly<Record<string, string>> = {
  Cribs: 'Furniture > Baby & Toddler Furniture > Cribs & Toddler Beds',
  'Mini Cribs': 'Furniture > Baby & Toddler Furniture > Cribs & Toddler Beds',
  'Changing Tables': 'Furniture > Baby & Toddler Furniture > Changing Tables',
  Dressers: 'Furniture > Cabinets & Storage > Dressers',
  Chests: 'Furniture > Cabinets & Storage > Dressers',
  Nightstands: 'Furniture > Tables > Nightstands',
};

/**
 * Feed titles for the products whose catalogue name carries no product type.
 *
 * "Arched Top in Seely" and "Mission in Brown Maple" tell a shopper nothing
 * about what the item is. Every Fisher one here is a crib - each description
 * calls it a "Convertible Crib" / "Style Crib" - and leads with the builder:
 * "Fisher Arched Top Crib in Seely". The Mini Newport's own copy calls it
 * "this compact crib". Only the feed title changes; the product name, slug
 * and page title stay as they are, and the colour suffix is still appended.
 */
export const FEED_TITLE_NAMES: Readonly<Record<string, string>> = {
  'arched-top': 'Fisher Arched Top Crib',
  bloomington: 'Fisher Bloomington Crib',
  darlington: 'Fisher Darlington Crib',
  hudson: 'Fisher Hudson Crib',
  mission: 'Fisher Mission Crib',
  moyerton: 'Fisher Moyerton Crib',
  princeton: 'Fisher Princeton Crib',
  'mini-newport-with-mattress': 'Mini Newport Crib with Mattress',
};

/** Wood species the catalogue uses as a `wood` variant, as the site names them. */
const WOOD_SPECIES: Readonly<Record<string, string>> = {
  BrownMaple: 'Brown Maple',
  CherryWood: 'Cherry',
  RedOak: 'Red Oak',
};

/** Google allows up to 10 additional images per item. */
const MAX_ADDITIONAL_IMAGES = 10;

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

function itemPriceDollars(item: InventoryItem): number {
  const stain = item.stains.find(s => s.inStock !== false) ?? item.stains[0];
  return item.basePrice + (stain?.priceAddition || 0);
}

function itemTitle(item: InventoryItem): string {
  const typed = item.slug ? FEED_TITLE_NAMES[item.slug] : undefined;
  const name = typed ?? item.productName;
  const base = typed ?? stripSiteSuffix(item.title || item.productName);
  if (item.variantType === 'none') return base;
  const label = variantLabel(item.wood, '').replace(' • ', ', ');
  return label ? `${name} in ${label}` : base;
}

/** `g:product_type`: the site's own hierarchy - category, then collection. */
export function itemProductType(item: InventoryItem): string | null {
  if (!item.category) return null;
  return ['Nursery Furniture', item.category, item.collection].filter(Boolean).join(' > ');
}

/**
 * `g:color`: the finish, for an item that IS one finish (a `finish` variant -
 * "Newport Crib in Carbon"). A `wood` item (the Fisher cribs) is sold in a
 * finish the customer picks at order time, and a `none` item has no colour
 * choice on the site, so neither gets a colour it does not have.
 */
export function itemColor(item: InventoryItem): string | null {
  if (item.variantType !== 'finish') return null;
  const label = variantLabel(item.wood, '');
  return label || null;
}

/**
 * `g:material`: only what the site itself states. A `wood` variant names the
 * species on the page ("Brown Maple"); otherwise the product description must
 * say it ("Crafted from solid hardwood with a rich Brown Maple finish").
 * Products that only say "solid wood" / "solid hardwoods" get nothing.
 */
export function itemMaterial(item: InventoryItem): string | null {
  if (item.variantType === 'wood' && WOOD_SPECIES[item.wood]) return WOOD_SPECIES[item.wood];
  const text = `${item.description ?? ''} ${item.extendedDescription ?? ''}`;
  if (/\bbrown maple\b/i.test(text)) return 'Brown Maple';
  if (/\bred oak\b/i.test(text)) return 'Red Oak';
  if (/\bcherry (?:wood|hardwood)\b|\bsolid cherry\b/i.test(text)) return 'Cherry';
  return null;
}

/**
 * `g:additional_image_link`: the site's other real photos of THIS item.
 *
 * A `wood` item (one SKU, finish chosen at order time) shows a photo per
 * finish on its page, and every one is a photo of the item being sold. A
 * `finish` item is a single colour, so the other colours' photos would show a
 * different product than the one advertised; `none` items have one photo.
 */
export function additionalImages(item: InventoryItem): string[] {
  if (item.variantType !== 'wood') return [];
  const main = pickDefaultImage(item.stains);
  const out: string[] = [];
  for (const stain of item.stains) {
    for (const url of [stain.image, ...(stain.gallery ?? []).map(g => g.url)]) {
      if (url && url !== main && !out.includes(url)) out.push(url);
    }
  }
  return out.slice(0, MAX_ADDITIONAL_IMAGES).map(brandUrl);
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

function browsableInventory(): InventoryItem[] {
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

  const category = item.category ? GOOGLE_PRODUCT_CATEGORY[item.category] : undefined;
  const productType = itemProductType(item);
  const color = itemColor(item);
  const material = itemMaterial(item);

  return [
    '    <item>',
    el('g:id', sku),
    el('g:item_group_id', itemGroupId(sku)),
    el('g:title', itemTitle(item)),
    el('g:description', itemDescription(item)),
    el('g:link', itemLink(item)),
    el('g:image_link', brandUrl(image)),
    ...additionalImages(item).map(url => el('g:additional_image_link', url)),
    el('g:price', price),
    el('g:availability', isInStock(item) ? 'in_stock' : 'out_of_stock'),
    el('g:condition', 'new'),
    el('g:brand', brand),
    // No g:mpn or g:gtin: the builders publish no GTINs, and the SKU is the
    // store's code rather than a confirmed manufacturer part number.
    el('g:identifier_exists', 'no'),
    ...(category ? [el('g:google_product_category', category)] : []),
    ...(productType ? [el('g:product_type', productType)] : []),
    ...(color ? [el('g:color', color)] : []),
    ...(material ? [el('g:material', material)] : []),
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
