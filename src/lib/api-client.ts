export interface CartItemPayload {
  productName: string;
  wood: string;
  stainName: string;
  quantity: number;
  addons?: Array<{ name: string }>;
}

export interface OrderTotals {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export interface CreatePaymentIntentRequest {
  cart: CartItemPayload[];
  /** Recorded on the PaymentIntent; the server rejects anything but `true`. */
  agreedToTerms: boolean;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  token: string;
  totals: OrderTotals;
}

export interface OrderItem {
  productName: string;
  wood: string;
  stainName: string;
  quantity: number;
  unitCents: number;
  addons: string[];
}

export interface OrderData extends OrderTotals {
  paymentIntentId: string;
  status: string;
  paid: boolean;
  email: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  items: OrderItem[];
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

export async function createPaymentIntent(
  req: CreatePaymentIntentRequest,
  signal?: AbortSignal
): Promise<CreatePaymentIntentResponse> {
  const res = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  return parse<CreatePaymentIntentResponse>(res);
}

export async function getOrder(
  paymentIntentId: string,
  token: string,
  signal?: AbortSignal
): Promise<OrderData> {
  const res = await fetch(`/api/orders/${encodeURIComponent(paymentIntentId)}`, {
    // Sent as a header so the capability token never enters the URL, browser
    // history, the Referer of outbound links, or analytics $current_url.
    headers: { 'x-order-token': token },
    signal,
  });
  return parse<OrderData>(res);
}
