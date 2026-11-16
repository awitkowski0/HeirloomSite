import { isPaymentOption, isUsState, type PaymentOption, type ShippingMethodId } from '@/lib/order-terms';

/*
 * The "fill link": how a person who has just talked an order through with a
 * customer in chat hands the result back to that customer's checkout.
 *
 * Staff build it on /staff/checkout-link and paste it into the chat. It opens
 * /checkout#fill=<payload>, and the checkout fills in the contact and
 * delivery fields, the delivery service and the payment option from it, then
 * removes the hash. The customer reviews everything, ticks the terms
 * themselves and presses Place order: nothing is ever submitted for them.
 *
 * The payload is in the URL HASH, which browsers never send to a server, so
 * a name and an address do not land in Vercel's request logs, and the page
 * stays statically prerendered. It is untrusted input: anyone can write such a
 * link. So it is validated field by field to the same limits the checkout
 * itself enforces, and it can only ever fill a form the customer then reads.
 * It cannot touch the cart, prices or the terms checkbox.
 */
export const FILL_FIELDS = ['email', 'phone', 'firstName', 'lastName', 'address', 'city', 'state', 'zip'] as const;
export type FillField = (typeof FILL_FIELDS)[number];

export interface FillPayload {
  shipping: Partial<Record<FillField, string>>;
  method?: ShippingMethodId;
  payment?: PaymentOption;
}

/** Mirrors MAX_FIELD in src/lib/pricing.ts and shippingStorage; the server rejects anything longer. */
const MAX_FIELD = 100;
const METHODS: readonly ShippingMethodId[] = ['threshold', 'white_glove'];
const HASH_KEY = 'fill';
const VERSION = 1;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

/** Drops empty and over-long fields and an unknown state; keeps the rest. */
export function cleanFill(input: unknown): FillPayload | null {
  if (typeof input !== 'object' || input === null) return null;
  const raw = input as Record<string, unknown>;
  if (raw.v !== VERSION) return null;
  const shipping: FillPayload['shipping'] = {};
  const fields = typeof raw.s === 'object' && raw.s !== null ? (raw.s as Record<string, unknown>) : {};
  for (const key of FILL_FIELDS) {
    const value = fields[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_FIELD) continue;
    if (key === 'state' && !isUsState(trimmed.toUpperCase())) continue;
    shipping[key] = key === 'state' ? trimmed.toUpperCase() : trimmed;
  }
  const method = METHODS.includes(raw.m as ShippingMethodId) ? (raw.m as ShippingMethodId) : undefined;
  const payment = isPaymentOption(raw.p) ? raw.p : undefined;
  if (Object.keys(shipping).length === 0 && !method && !payment) return null;
  return { shipping, method, payment };
}

export function encodeFill(payload: FillPayload): string {
  return `${HASH_KEY}=${toBase64Url(JSON.stringify({ v: VERSION, s: payload.shipping, m: payload.method, p: payload.payment }))}`;
}

/** Reads `#fill=...` from a location hash; null for anything else or anything invalid. */
export function decodeFillHash(hash: string): FillPayload | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const value = params.get(HASH_KEY);
  if (!value || value.length > 4000) return null;
  try {
    return cleanFill(JSON.parse(fromBase64Url(value)));
  } catch {
    return null;
  }
}
