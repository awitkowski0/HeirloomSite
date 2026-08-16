/**
 * Order terms shared by the client checkout and the server pricer.
 *
 * Deliberately NOT marked `server-only`, for the same reason as
 * src/lib/cart-limits.ts: pricing.ts is server-only and the checkout is a
 * client module, so anything both of them must agree about has to be
 * importable by both. Unlike cart-limits this carries a little arithmetic, but
 * it is pure integer maths over values the client already knows -- no secrets,
 * no catalogue, nothing that has to stay on the server.
 *
 * What this replaces: `TAX_RATE = 0.08` and `SHIPPING_CENTS = 0` were written
 * out twice, in src/lib/pricing.ts and again in
 * src/components/checkout/CheckoutClient.tsx, bound only by a comment saying
 * "must match". Tax is no longer a single constant -- it depends on where the
 * order ships -- so a copy that can silently drift is no longer survivable:
 * the drift would show up as a total that changes between the summary and the
 * invoice.
 */

/*
 * Delivery is CHARGED, and the customer chooses how.
 *
 * The site previously said delivery was included in the product price and
 * charged nothing for it - in the checkout summary, the product page
 * assurances, the invoice footer and the Product JSON-LD. That was wrong: it
 * is quoted separately, and shipping every order for nothing was giving away
 * $685 at a minimum on each one.
 *
 * Prices are flat per ORDER, not per item: a crib and its dresser go on one
 * truck. If that ever stops being true this is where it changes.
 */
export type ShippingMethodId = 'threshold' | 'white_glove';

export interface ShippingMethod {
  id: ShippingMethodId;
  name: string;
  /* Shown under the name at checkout. Confirm the exact service wording with
     the carrier before launch - these describe the industry-standard tiers. */
  description: string;
  cents: number;
}

export const SHIPPING_METHODS: readonly ShippingMethod[] = [
  {
    id: 'threshold',
    name: 'Threshold Delivery',
    description: 'Delivery to the door.',
    cents: 68_500,
  },
  {
    id: 'white_glove',
    name: 'White Glove Delivery',
    description: 'White-glove delivery and assembly in your home.',
    cents: 75_000,
  },
];

/*
 * True of BOTH tiers, so it is stated once under the pair rather than repeated
 * in each description - a limit that appears twice reads as two different
 * limits, and someone comparing the options should be weighing what differs.
 */
export const SHIPPING_LIMIT_NOTE = 'Both are limited to three flights of stairs.';

/** The cheaper of the two, so an untouched checkout quotes the lower number. */
export const DEFAULT_SHIPPING_METHOD: ShippingMethodId = 'threshold';

export function isShippingMethodId(value: unknown): value is ShippingMethodId {
  return SHIPPING_METHODS.some(m => m.id === value);
}

export function shippingMethodById(id: ShippingMethodId): ShippingMethod {
  const method = SHIPPING_METHODS.find(m => m.id === id);
  // Unreachable via isShippingMethodId, but this is money: never silently zero.
  if (!method) throw new Error(`Unknown shipping method: ${id}`);
  return method;
}

export function shippingCentsFor(id: ShippingMethodId): number {
  return shippingMethodById(id).cents;
}

/** The lowest delivery price, for the "from" figure in Product JSON-LD. */
export function cheapestShippingCents(): number {
  return Math.min(...SHIPPING_METHODS.map(m => m.cents));
}

/** The only state the shop has nexus in, so the only one it collects tax for. */
export const TAXED_STATE = 'PA';

/*
 * Basis points, not 0.06.
 *
 * pricing.ts's header rule is that all arithmetic is integer cents, because
 * float dollars produced 1759.2 * 100 === 205019.99999999997 and Stripe
 * rejects a non-integer amount. `cents * 600 / 10000` keeps that promise;
 * `cents * 0.06` reintroduces exactly the class of value that caused it.
 */
export const PA_TAX_RATE_BPS = 600;

export interface UsState {
  code: string;
  name: string;
}

/*
 * The 50 states plus DC.
 *
 * Territories are omitted: the checkout hardcodes `country: 'US'` and this is
 * furniture delivered by truck, so a Guam address is a support conversation
 * rather than a checkout. Adding one here is all it would take.
 */
export const US_STATES: readonly UsState[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const STATE_CODES = new Set(US_STATES.map(s => s.code));

/** True for a canonical two-letter code. Callers must uppercase first. */
export function isUsState(code: string): boolean {
  return STATE_CODES.has(code);
}

/*
 * Where the shop actually delivers.
 *
 * The trucks run a regional route, so the checkout offers these states and no
 * others rather than taking an order it cannot fulfil and unwinding it by
 * phone. Enforced on the server too - the <select> is a convenience, not a
 * control.
 *
 * Widening the route is this array plus nothing else.
 */
export const SHIPPABLE_STATE_CODES: readonly string[] = [
  'PA',
  'NJ',
  'NY',
  'CT',
  'OH',
  'MD',
  'VA',
];

const SHIPPABLE = new Set(SHIPPABLE_STATE_CODES);

/** The states offered at checkout, in the same order as US_STATES. */
export const SHIPPABLE_STATES: readonly UsState[] = US_STATES.filter(s => SHIPPABLE.has(s.code));

/** True for a state the shop delivers to. Callers must uppercase first. */
export function isShippableState(code: string): boolean {
  return SHIPPABLE.has(code);
}

/** The states we do NOT deliver to, still offered so we can say why. */
export const UNSHIPPABLE_STATES: readonly UsState[] = US_STATES.filter(
  s => !SHIPPABLE.has(s.code)
);

/** "Texas" for "TX". Falls back to the code so a message is never blank. */
export function stateName(code: string): string {
  return US_STATES.find(s => s.code === code.toUpperCase())?.name ?? code;
}

/**
 * Sales tax for an order shipping to `state`.
 *
 * The shop has nexus only in Pennsylvania, so every other destination is 0 --
 * not "untaxed pending a lookup", genuinely zero, and the checkout says so.
 *
 * `taxableCents` is subtotal PLUS delivery rather than subtotal alone.
 * Delivery is $0 today so the two are identical, but PA taxes delivery charges
 * on a taxable item, so passing the base in this shape means reinstating a
 * delivery fee does not silently start under-collecting.
 *
 * KNOWN LIMITATION, deliberate: this is the flat 6% state rate. Allegheny
 * County adds 1% (7% total) and Philadelphia adds 2% (8% total), and this
 * under-collects for both -- a shortfall the shop, not the buyer, is liable
 * for. Handling it properly needs a ZIP-to-jurisdiction table, and ZIP
 * boundaries cross county lines, so the honest fix at that point is Stripe Tax.
 * The practical safety net is that a human finalises every invoice and can
 * correct the tax line before sending.
 */
export function taxCentsFor(state: string, taxableCents: number): number {
  if (state.toUpperCase() !== TAXED_STATE) return 0;
  return Math.round((taxableCents * PA_TAX_RATE_BPS) / 10_000);
}

/*
 * How much is due now.
 *
 * The terms (src/components/checkout/TermsBlock.tsx) require "a minimum 50%
 * non-refundable deposit of the total order price", and the balance is
 * invoiced once staining is done.
 */
export type PaymentOption = 'deposit' | 'full';

export function isPaymentOption(value: unknown): value is PaymentOption {
  return value === 'deposit' || value === 'full';
}

export interface PaymentSplit {
  dueNowCents: number;
  dueLaterCents: number;
}

/**
 * Split a total into what is invoiced now and what is invoiced on completion.
 *
 * `ceil` on the deposit, not `round`: the terms say a MINIMUM of 50%, so an odd
 * cent belongs to the half being collected up front. The balance is derived by
 * subtraction rather than computed independently, which is what guarantees the
 * two invoices sum to the total exactly - there is no rounding to disagree
 * about, because the second number is defined as "the rest".
 */
export function splitPayment(totalCents: number, option: PaymentOption): PaymentSplit {
  if (option === 'full') return { dueNowCents: totalCents, dueLaterCents: 0 };
  const dueNowCents = Math.ceil(totalCents / 2);
  return { dueNowCents, dueLaterCents: totalCents - dueNowCents };
}
