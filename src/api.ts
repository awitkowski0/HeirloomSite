interface CartItemPayload {
  productName: string;
  wood: string;
  stainName: string;
  image: string;
  quantity: number;
  addons?: Array<{ name: string; price: number; stainName?: string }>;
}

export interface CreatePaymentIntentRequest {
  cart: CartItemPayload[];
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
}

export interface OrderItem {
  productName: string;
  wood: string;
  stainName: string;
  price: number;
  image: string;
  quantity: number;
  addons?: Array<{ name: string; price: number; stainName?: string }>;
}

export interface OrderData {
  paymentIntentId: string;
  status: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

export function createPaymentIntent(req: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
  return apiPost<CreatePaymentIntentResponse>('/api/stripe/create-payment-intent', req);
}

export function getOrder(paymentIntentId: string, token: string): Promise<OrderData> {
  return apiGet<OrderData>(`/api/orders/${encodeURIComponent(paymentIntentId)}?token=${encodeURIComponent(token)}`);
}
