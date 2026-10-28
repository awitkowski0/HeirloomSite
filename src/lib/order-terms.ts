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
 * The charge is not in the product price. It is one amount per order, chosen
 * at checkout, and it steps up with the merchandise subtotal. A crib and its
 * dresser still share one truck. If that ever stops being true this is where
 * it changes.
 *
 * The id 'threshold' is the cheaper option on purpose: older checkout bundles
 * and stored sessions send it in `shippingMethod`, and renaming it would turn
 * those requests into "Choose a delivery method" errors. The customer-facing
 * label is Curbside.
 *
 * Bands are "from this merchandise subtotal and up", in integer cents. Compare
 * cents, never dollars: 2499.99 * 100 is not a safe threshold.
 */
export type ShippingMethodId = 'threshold' | 'white_glove';

export interface ShippingMethod {
  id: ShippingMethodId;
  name: string;
  /* Shown under the name at checkout. Confirm the exact service wording with
     the carrier before launch - these describe the industry-standard tiers. */
  description: string;
  /* Invoice, email and footer wording. `name` is the short radio-button label
     and reads wrongly on a bill ("Curbside" is not a line item). */
  invoiceLabel: string;
}

export const SHIPPING_METHODS: readonly ShippingMethod[] = [
  {
    id: 'threshold',
    name: 'Curbside',
    invoiceLabel: 'Curbside delivery',
    description: 'Delivery to the curb at your address.',
  },
  {
    id: 'white_glove',
    name: 'White Glove',
    invoiceLabel: 'White Glove delivery',
    description: 'White Glove delivery and assembly in your home.',
  },
];

export interface DeliveryBand {
  /** Merchandise subtotal, in cents, at which this band starts (inclusive). */
  fromCents: number;
  threshold: number;
  white_glove: number;
}

/** The only delivery price list. Checkout, the invoice, and emails all read it. */
export const DELIVERY_BANDS: readonly DeliveryBand[] = [
  { fromCents: 0, threshold: 17_500, white_glove: 29_900 },
  { fromCents: 250_000, threshold: 32_500, white_glove: 42_500 },
  { fromCents: 350_000, threshold: 42_500, white_glove: 55_000 },
  { fromCents: 450_000, threshold: 57_500, white_glove: 72_500 },
  { fromCents: 600_000, threshold: 72_500, white_glove: 92_500 },
  { fromCents: 750_000, threshold: 85_000, white_glove: 110_000 },
  { fromCents: 900_000, threshold: 115_000, white_glove: 147_500 },
];

/*
 * True of BOTH tiers, so it is stated once under the pair rather than repeated
 * in each description - a limit that appears twice reads as two different
 * limits, and someone comparing the options should be weighing what differs.
 */
export const SHIPPING_LIMIT_NOTE =
  'White Glove includes up to 3 flights of stairs. Curbside is curb-only: no stairs and no indoor delivery.';

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

/**
 * Delivery charge for a merchandise subtotal, in integer cents.
 *
 * `subtotalCents` is the goods total before coupon, tax, and this charge.
 * The band is the highest `fromCents` that the subtotal has reached.
 * Callers that price an order must pass the cart subtotal. The opening band
 * ($0) is only the floor, not the charge for a real cart.
 */
export function deliveryChargeFor(subtotalCents: number, option: ShippingMethodId): number {
  // Validates the id. An unknown method must not price as $0.
  shippingMethodById(option);
  const subtotal = Number.isFinite(subtotalCents) ? Math.max(0, Math.round(subtotalCents)) : 0;
  let cents = DELIVERY_BANDS[0][option];
  for (const band of DELIVERY_BANDS) {
    if (subtotal >= band.fromCents) cents = band[option];
  }
  return cents;
}

/** Opening-band charge (merchandise subtotal of $0). Not the cart charge. */
export function shippingCentsFor(id: ShippingMethodId): number {
  return deliveryChargeFor(0, id);
}

/** The lowest delivery price, the Curbside floor. */
export function cheapestShippingCents(): number {
  return deliveryChargeFor(0, 'threshold');
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
 * Widening the route is this array. NJ ZIPs in EXCLUDED_METRO_ZIPS are
 * inside the state list but not given a published price.
 */
export const SHIPPABLE_STATE_CODES: readonly string[] = ['PA', 'NJ', 'MD'];

/**
 * Keystone's excluded metro is NYC (5 boroughs), Long Island and Newark NJ
 * (Phil, 2026-10-21). NY is not a delivery state at all, so the only ZIPs we
 * need here are Newark's city ZIPs: exact 5-digit matches, so Elizabeth,
 * Jersey City, Hoboken etc. stay deliverable.
 */
export const EXCLUDED_METRO_ZIPS: readonly string[] = ['07101', '07102', '07103', '07104', '07105', '07106', '07107', '07108', '07112', '07114', '07175', '07184', '07188', '07189', '07191', '07192', '07193', '07194', '07195', '07198', '07199'];

/**
 * Shown when we will not quote delivery: a state outside PA/NJ/MD, or an NJ
 * ZIP in the excluded metro. The checkout links "contact us" at /contact.
 */
export const UNPUBLISHED_DELIVERY_MESSAGE =
  "We don't publish delivery pricing for this area. Please contact us for delivery options.";

/** A US ZIP exactly as delivery is priced from it: 12345 or 12345-6789. */
export function isValidUsZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

/** The five-digit ZIP, or '' unless the whole value is a valid US ZIP. */
export function zip5(zip: string): string {
  return isValidUsZip(zip) ? zip.trim().slice(0, 5) : '';
}

/**
 * True for a ZIP in the excluded Newark metro set. Checked whatever state was
 * picked: a Newark ZIP does not become deliverable by pairing it with PA.
 */
export function isExcludedMetroZip(zip: string): boolean {
  const five = zip5(zip);
  return five !== '' && EXCLUDED_METRO_ZIPS.includes(five);
}

/** Why checkout will not quote delivery yet, or 'ok'. */
export type DeliveryAreaStatus = 'ok' | 'zip_missing' | 'zip_invalid' | 'state' | 'excluded_zip';

/**
 * The single rule for "may a delivery price be shown or billed for this
 * address". Checkout, the form and the server all go through it.
 *
 * A price needs BOTH a delivery state and a strictly valid ZIP. An empty ZIP
 * is 'zip_missing' (not yet typed, nothing to report); anything typed that is
 * not 12345 / 12345-6789 is 'zip_invalid'.
 */
export function deliveryAreaStatus(state: string, zip: string): DeliveryAreaStatus {
  const code = state.trim().toUpperCase();
  if (code !== '' && !isShippableState(code)) return 'state';
  if (zip.trim() === '') return 'zip_missing';
  if (!isValidUsZip(zip)) return 'zip_invalid';
  if (isExcludedMetroZip(zip)) return 'excluded_zip';
  return code === '' ? 'zip_missing' : 'ok';
}

/** True when checkout may show a delivery price for this state and ZIP. */
export function isPublishedDeliveryArea(state: string, zip: string): boolean {
  return deliveryAreaStatus(state, zip) === 'ok';
}

const SHIPPABLE = new Set(SHIPPABLE_STATE_CODES);

/** The states offered at checkout, in the same order as US_STATES. */
export const SHIPPABLE_STATES: readonly UsState[] = US_STATES.filter(s => SHIPPABLE.has(s.code));

/** True for a state the shop delivers to. Callers must uppercase first. */
export function isShippableState(code: string): boolean {
  return SHIPPABLE.has(code);
}


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
 * PA taxes the delivery charge on a taxable item, so the base passed here
 * includes deliveryChargeFor() — leaving it off would under-collect.
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
export type PaymentOption = 'affirm' | 'deposit' | 'full';

const PAYMENT_OPTIONS: readonly PaymentOption[] = ['affirm', 'deposit', 'full'];

export function isPaymentOption(value: unknown): value is PaymentOption {
  return PAYMENT_OPTIONS.includes(value as PaymentOption);
}

/*
 * Affirm's own limits, in cents, from Stripe's Affirm page: USD 35 to
 * USD 30,000, US buyers only. The site already ships US-only, so the amount is
 * the only part we can get wrong.
 *
 * Checked rather than assumed because the range brackets this catalogue on both
 * sides: a single conversion kit is under $35, and a nursery set with white
 * glove delivery can pass $30,000. Outside it Stripe simply does not present
 * Affirm on the invoice, so an unchecked option would be a promise the hosted
 * invoice page then silently breaks.
 */
export const AFFIRM_MIN_CENTS = 3_500;
export const AFFIRM_MAX_CENTS = 3_000_000;

export function affirmEligible(totalCents: number): boolean {
  return totalCents >= AFFIRM_MIN_CENTS && totalCents <= AFFIRM_MAX_CENTS;
}

/**
 * The option to actually bill, once the total is known.
 *
 * Affirm on an ineligible total degrades to a plain pay-in-full invoice rather
 * than erroring: the customer asked to pay the whole amount and that is exactly
 * what the invoice asks for, so refusing the order would cost a sale over a
 * financing method Stripe was never going to offer. The checkout hides the
 * option in that range anyway - this is the guard for a request that did not
 * come from our form.
 */
export function resolvePaymentOption(
  requested: PaymentOption,
  totalCents: number
): PaymentOption {
  if (requested === 'affirm' && !affirmEligible(totalCents)) return 'full';
  return requested;
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
 *
 * Affirm splits like 'full' because that is what it is: Affirm pays us the
 * whole amount up front and collects instalments from the customer itself. The
 * instalments are Affirm's schedule, never ours, so nothing about them appears
 * on the invoice or in these figures.
 */
export function splitPayment(totalCents: number, option: PaymentOption): PaymentSplit {
  if (option !== 'deposit') return { dueNowCents: totalCents, dueLaterCents: 0 };
  const dueNowCents = Math.ceil(totalCents / 2);
  return { dueNowCents, dueLaterCents: totalCents - dueNowCents };
}
