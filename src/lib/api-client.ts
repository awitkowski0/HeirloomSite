import type { PaymentOption } from './order-terms';

export interface CartItemPayload {
  productName: string;
  wood: string;
  stainName: string;
  quantity: number;
  addons?: Array<{ name: string }>;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export interface CreateQuoteRequest {
  cart: CartItemPayload[];
  /** Recorded on the invoice; the server rejects anything but `true`. */
  agreedToTerms: boolean;
  /** Cloudflare Turnstile token; required only when the server has a secret. */
  turnstileToken?: string;
  /** Which delivery tier. Defaults to the cheaper one server-side. */
  shippingMethod: 'threshold' | 'white_glove';
  /**
   * 'deposit' (50% now), 'full', or 'affirm' (full, financed by Affirm).
   * Defaults to 'deposit' server-side; 'affirm' falls back to 'full' when the
   * total is outside Affirm's range.
   */
  paymentOption: PaymentOption;
  /** A Stripe Promotion Code, re-validated server-side. Omit for no coupon. */
  couponCode?: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface CreateQuoteResponse {
  orderRef: string;
  totals: OrderTotals;
  dueNowCents: number;
  dueLaterCents: number;
  /** Always null: Stripe only mints it when a draft is finalised. */
  hostedInvoiceUrl: string | null;
  /*
   * Whether the customer confirmation email actually went out. The order is
   * recorded either way - this only decides whether the success screen may
   * promise an email. It can be false for two ordinary reasons: Resend is not
   * configured, or Turnstile is unconfigured in production and the route
   * refuses to mail an address nothing has verified.
   */
  confirmationSent: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Parse a response, checking res.ok FIRST.
 *
 * The old helpers called res.json() immediately and decided success purely on
 * the absence of an `error` key. A Vercel 502 returns an HTML page, so
 * res.json() threw a SyntaxError; and a body shaped {"message": "..."} was
 * returned as a valid success value, after which the caller set an undefined
 * clientSecret and mounted Stripe Elements against nothing.
 */
async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        res.ok ? 'Received an invalid response from the server.' : `Request failed (${res.status})`,
        res.status
      );
    }
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ||
      (res.status >= 500
        ? 'Something went wrong on our end. Please try again.'
        : `Request failed (${res.status})`);
    throw new ApiError(message, res.status);
  }

  const maybeError = (data as { error?: string } | null)?.error;
  if (maybeError) throw new ApiError(maybeError, res.status);

  return data as T;
}

export async function createQuote(
  req: CreateQuoteRequest,
  signal?: AbortSignal
): Promise<CreateQuoteResponse> {
  const res = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  return parse<CreateQuoteResponse>(res);
}

export interface ValidateCouponRequest {
  code: string;
  cart: CartItemPayload[];
  turnstileToken?: string;
}

export interface ValidateCouponResponse {
  valid: true;
  /** Canonical code as Stripe stored it, for display. */
  code: string;
  amountOffCents: number;
  /** Preview only - /api/quotes recomputes this independently at submit time. */
  discountCents: number;
}

export async function validateCoupon(
  req: ValidateCouponRequest,
  signal?: AbortSignal
): Promise<ValidateCouponResponse> {
  const res = await fetch('/api/coupon/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  return parse<ValidateCouponResponse>(res);
}
