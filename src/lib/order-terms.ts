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
 * Delivery is included in the product price. Kept as a named constant rather
 * than deleted so reinstating a delivery charge is one line. See the longer
 * note in src/lib/pricing.ts about the $150 this used to add on top of a price
 * that already included it.
 */
export const SHIPPING_CENTS = 0;

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
