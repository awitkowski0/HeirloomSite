import 'server-only';
import pricingTable from '../../data/pricing.json';
import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from './cart-limits';
import {
  DEFAULT_SHIPPING_METHOD,
  isShippableState,
  isShippingMethodId,
  shippingCentsFor,
  taxCentsFor,
  type ShippingMethodId,
} from './order-terms';

/**
 * Server-authoritative pricing.
 *
 * The client never sends prices; this module is the only source of truth for
 * what a cart costs. pricing.json is a build-time artifact (54 KB) imported
 * statically so it is always in the function bundle: under Next on Vercel,
 * public/ is uploaded to the CDN and is NOT traced into the lambda, so the old
 * readFileSync(process.cwd() + '/public/data/inventory.json') worked only
 * because of vercel.json's includeFiles glob, which no longer exists.
 *
 * All arithmetic is in integer cents. Dollars-as-floats produced
 * 1759.2 * 100 === 205019.99999999997, which Stripe rejects outright.
 */

/*
 * Delivery is included in the product price.
 *
 * This was 15_000 - $150 added on top of the item total, server-side, in the
 * amount actually charged to the card. With delivery built into the price
 * that overcharged every order by $150.
 *
 * The constant itself now lives in ./order-terms, which the client checkout
 * imports too - it was declared separately in both places, as was the tax
 * rate. Re-exported here so existing server-side import sites do not care.
 */
export { MAX_CART_LINES, MAX_QUANTITY_PER_LINE };

interface PricingStain {
  name: string;
  priceAddition: number;
  inStock: boolean;
}
interface PricingRow {
  productName: string;
  wood: string;
  basePrice: number;
  addons: Array<{ name: string; price: number }>;
  stains: PricingStain[];
}

const TABLE = pricingTable as PricingRow[];

/*
 * The key separator: a character that cannot occur in a product name or a wood.
 *
 * Built from a char code rather than written as a literal. A raw NUL byte in
 * the source makes git classify this file as BINARY - `git diff` then reports
 * only "Bin 8404 -> 9506 bytes" and shows nothing, on the one file that decides
 * every amount this business charges. It hid the tax rewrite on this branch
 * from review entirely. The runtime keys are byte-for-byte identical either
 * way; only the source encoding changes.
 */
const KEY_SEP = String.fromCharCode(0);

const byKey = new Map<string, PricingRow>();
for (const row of TABLE) {
  byKey.set(`${row.productName}${KEY_SEP}${row.wood}`, row);
}

export class PricingError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PricingError';
    this.status = status;
  }
}

export interface IncomingCartLine {
  productName: unknown;
  wood: unknown;
  stainName: unknown;
  quantity?: unknown;
  addons?: unknown;
}

export interface PricedLine {
  productName: string;
  wood: string;
  stainName: string;
  unitCents: number;
  quantity: number;
  lineCents: number;
  addons: Array<{ name: string; priceCents: number }>;
}

/** A validated, fixed-amount-off coupon, resolved against Stripe by src/lib/coupon.ts. */
export interface CartCoupon {
  code: string;
  promotionCodeId: string;
  amountOffCents: number;
}

export interface PricedCart {
  lines: PricedLine[];
  shippingMethod: ShippingMethodId;
  subtotalCents: number;
  /** 0 when no coupon is applied. Never more than subtotalCents. */
  discountCents: number;
  coupon: CartCoupon | null;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PricingError(`Invalid ${field}`);
  }
  return value;
}

/**
 * The catalogue-priced lines and their subtotal, with none of the
 * destination-specific work (shipping tier, tax jurisdiction) `priceCart`
 * also does. Split out so a trustworthy subtotal is available to code that
 * only needs it - the coupon validation endpoint, which runs before the
 * customer has necessarily chosen a shipping method or entered a state.
 */
function priceLines(cart: unknown): { lines: PricedLine[]; subtotalCents: number } {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new PricingError('Cart is required');
  }
  if (cart.length > MAX_CART_LINES) {
    throw new PricingError('Cart has too many items');
  }

  const lines: PricedLine[] = [];

  for (const raw of cart as IncomingCartLine[]) {
    if (typeof raw !== 'object' || raw === null) throw new PricingError('Invalid cart line');

    const productName = asString(raw.productName, 'productName');
    const wood = asString(raw.wood, 'wood');
    const stainName = asString(raw.stainName, 'stainName');

    const row = byKey.get(`${productName}${KEY_SEP}${wood}`);
    if (!row) throw new PricingError(`Product not found: ${productName} / ${wood}`);

    const stain = row.stains.find(s => s.name === stainName);
    if (!stain) throw new PricingError(`Stain not found: ${stainName}`);
    if (!stain.inStock) throw new PricingError(`Out of stock: ${productName} / ${stainName}`);

    // Quantity: positive integer with an upper bound. There was previously no
    // ceiling, so quantity: 1e9 was accepted and overflowed Stripe's max amount.
    let quantity = 1;
    if (raw.quantity !== undefined) {
      if (
        typeof raw.quantity !== 'number' ||
        !Number.isInteger(raw.quantity) ||
        raw.quantity <= 0 ||
        raw.quantity > MAX_QUANTITY_PER_LINE
      ) {
        throw new PricingError(`Invalid quantity for ${productName}`);
      }
      quantity = raw.quantity;
    }

    /*
     * Add-ons are priced from the catalogue, never from the request.
     *
     * The old handler ignored item.addons when computing the amount but copied
     * them verbatim into the order metadata, so a client could post
     * addons:[{name:"Conversion Kit", price:400}] and receive them for free.
     * Anything not in this product's catalogue is rejected rather than
     * silently dropped.
     */
    const addons: PricedLine['addons'] = [];
    if (raw.addons !== undefined) {
      if (!Array.isArray(raw.addons)) throw new PricingError('Invalid addons');
      /*
       * Bounded and de-duplicated, which every other input here already was.
       * The catalogue check below rejects an add-on that does not exist, but it
       * did not stop the SAME one being listed a thousand times: each pass
       * pushed another priced entry and unitCents grew without limit, until
       * Stripe rejected the amount and a hand-made cart turned into a 500.
       * A product cannot legitimately want more add-ons than it offers.
       */
      if (raw.addons.length > row.addons.length) {
        throw new PricingError(`Too many add-ons for ${productName}`);
      }
      const seen = new Set<string>();
      for (const incoming of raw.addons) {
        const name = asString((incoming as { name?: unknown })?.name, 'addon name');
        if (seen.has(name)) throw new PricingError(`Duplicate add-on: ${name}`);
        seen.add(name);
        const known = row.addons.find(a => a.name === name);
        if (!known) throw new PricingError(`Unknown add-on: ${name}`);
        addons.push({ name: known.name, priceCents: Math.round(known.price * 100) });
      }
    }

    const addonCents = addons.reduce((sum, a) => sum + a.priceCents, 0);
    const unitCents = Math.round((row.basePrice + (stain.priceAddition || 0)) * 100) + addonCents;
    lines.push({
      productName,
      wood,
      stainName,
      unitCents,
      quantity,
      lineCents: unitCents * quantity,
      addons,
    });
  }

  return { lines, subtotalCents: lines.reduce((sum, l) => sum + l.lineCents, 0) };
}

/**
 * A cart's product subtotal alone, with no shipping/tax/coupon work done.
 *
 * Exists for POST /api/coupon/validate: a coupon code can be checked before
 * a shipping method or destination state is known, and its minimum-order
 * restriction is compared against this same subtotal - never a client-sent
 * number, since the client cannot be trusted with prices.
 */
export function cartSubtotalCents(cart: unknown): number {
  return priceLines(cart).subtotalCents;
}

/**
 * Price a cart for delivery to `state` by `shippingMethod`, optionally with a
 * coupon already resolved against Stripe (see src/lib/coupon.ts).
 *
 * `state` is required rather than optional: tax is no longer a single rate, so
 * a caller that forgets it would silently produce an untaxed order. Callers
 * pass the value from validateShipping(), which has already checked it is a
 * state the shop delivers to.
 */
export function priceCart(
  cart: unknown,
  state: string,
  shippingMethod: ShippingMethodId = DEFAULT_SHIPPING_METHOD,
  coupon: CartCoupon | null = null
): PricedCart {
  const { lines, subtotalCents } = priceLines(cart);

  // Never below zero, never more than the subtotal - a coupon cannot make the
  // pre-tax, pre-shipping portion of the order negative.
  const discountCents = coupon ? Math.min(coupon.amountOffCents, subtotalCents) : 0;

  const shippingCents = shippingCentsFor(shippingMethod);
  /*
   * Tax is on (subtotal - discount) PLUS delivery. A coupon is a seller-funded
   * discount, so the customer is taxed on what they actually pay, same as PA
   * taxes the delivery charge on a taxable item (a $685 delivery adds $41.10 of
   * tax on a PA order).
   */
  const taxCents = taxCentsFor(state, subtotalCents - discountCents + shippingCents);

  return {
    lines,
    shippingMethod,
    subtotalCents,
    discountCents,
    coupon,
    shippingCents,
    taxCents,
    totalCents: subtotalCents - discountCents + shippingCents + taxCents,
  };
}

/**
 * Terms acceptance, recorded server-side.
 *
 * The checkbox was client state and nothing more: the server had no record that
 * the buyer had agreed to anything. For a shop whose terms say "all sales
 * final" on custom orders, the acceptance is the evidence that matters in a
 * chargeback, and evidence that only ever existed in the payer's browser is no
 * evidence at all.
 *
 * Records a flag, deliberately NOT a timestamp. An acceptance time generated
 * per request made the invoice parameters differ on every submit while the
 * idempotency key stayed the same, so Stripe rejected every resubmit with an
 * idempotency_error - which is exactly the double-submit case the key exists
 * to handle. The authoritative acceptance time is the invoice's own `created`,
 * which is Stripe-side rather than self-reported, and stable.
 */
/**
 * The chosen delivery method, from the request.
 *
 * Falls back to the cheaper option rather than throwing: an absent field is an
 * older client, and quoting the lower price is the failure that does not
 * overcharge anyone. An INVALID one still throws, because that is a hand-made
 * request rather than a stale bundle.
 */
export function requireShippingMethod(body: Record<string, unknown>): ShippingMethodId {
  if (body.shippingMethod === undefined) return DEFAULT_SHIPPING_METHOD;
  if (!isShippingMethodId(body.shippingMethod)) {
    throw new PricingError('Choose a delivery method');
  }
  return body.shippingMethod;
}

export function requireTermsAcceptance(body: Record<string, unknown>): void {
  if (body.agreedToTerms !== true) {
    throw new PricingError('The refund and cancellation policy must be accepted');
  }
}

// ---------------------------------------------------------------------------
// Shipping details validation
// ---------------------------------------------------------------------------

export interface ShippingDetails {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

const MAX_FIELD = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validate types and shapes, not just truthiness.
 *
 * The old check was `if (!email || !firstName || ...)`, so a JSON body of
 * {"email": {"$ne": null}} passed and reached the Stripe SDK, and a 600-char
 * firstName sailed through into metadata (which caps values at 500 chars).
 */
export function validateShipping(body: Record<string, unknown>): ShippingDetails {
  const field = (key: keyof ShippingDetails): string => {
    const value = body[key];
    if (typeof value !== 'string') throw new PricingError(`Invalid ${key}`);
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new PricingError(`${key} is required`);
    if (trimmed.length > MAX_FIELD) throw new PricingError(`${key} is too long`);
    return trimmed;
  };

  const email = field('email');
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw new PricingError('Invalid email address');
  }

  const zip = field('zip');
  if (!/^[A-Za-z0-9][A-Za-z0-9\- ]{2,11}$/.test(zip)) {
    throw new PricingError('Invalid postal code');
  }

  /*
   * Digits only, formatting ignored - mirrors isUsPhone in ShippingForm.tsx.
   * Required rather than optional: every order gets a confirmation call before
   * it goes into production, so an order without a reachable number is one that
   * stops at the first question.
   */
  const phone = field('phone');
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length !== 10 && !(phoneDigits.length === 11 && phoneDigits.startsWith('1'))) {
    throw new PricingError('Invalid phone number');
  }

  /*
   * Checked against the real list, and normalised to upper case.
   *
   * This was free text, which was survivable while tax was a flat rate applied
   * to everyone. It is not survivable now that the string decides whether 6%
   * is charged: "pa", "Pa " and "Pennsylvania" would each fall through to the
   * zero-tax branch and under-collect on a Pennsylvania order. The <select>
   * only ever submits a canonical code, so this is guarding a hand-made
   * request - the same threat model as the type checks above.
   */
  /*
   * A state the shop DELIVERS to, not merely a real one.
   *
   * The trucks run a regional route. Accepting a Texas address here would take
   * an order that has to be unwound by phone, after the customer has already
   * been told we have it. The <select> only offers the shippable states, so
   * this is guarding a hand-made request - the same threat model as the type
   * checks above.
   */
  const state = field('state').toUpperCase();
  if (!isShippableState(state)) {
    throw new PricingError('We do not deliver to that state yet. Please contact us.');
  }

  return {
    email,
    phone,
    firstName: field('firstName'),
    lastName: field('lastName'),
    address: field('address'),
    city: field('city'),
    state,
    zip,
  };
}
