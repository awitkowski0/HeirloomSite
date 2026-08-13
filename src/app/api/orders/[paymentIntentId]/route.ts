import { NextResponse } from 'next/server';
import { getStripe, StripeNotConfiguredError } from '@/lib/stripe-server';
import { verifyOrderToken } from '@/lib/orderToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CompactItem {
  p: string;
  w: string;
  s: string;
  q: number;
  c: number;
  a?: string[];
}

/** Reassemble the numbered items_N metadata chunks written at creation. */
function readItems(metadata: Record<string, string>): CompactItem[] {
  const out: CompactItem[] = [];
  for (let i = 0; ; i++) {
    const chunk = metadata[`items_${i}`];
    if (!chunk) break;
    try {
      out.push(...(JSON.parse(chunk) as CompactItem[]));
    } catch {
      // A malformed chunk should not fail the whole lookup.
    }
  }
  return out;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ paymentIntentId: string }> }
) {
  const { paymentIntentId } = await params;

  /*
   * Header only.
   *
   * The token is a bearer credential for a response containing name, street
   * address and email. A `?token=` fallback used to be accepted "so links
   * already issued keep working" - but nothing in this project has ever sent an
   * email, so no such link was ever issued, and the fallback's only real effect
   * was that PostHog captures $current_url INCLUDING the query string on every
   * pageview. Any use of it shipped the credential to a third party.
   */
  const token = req.headers.get('x-order-token');

  if (!paymentIntentId || !/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
    return NextResponse.json({ error: 'Invalid payment intent id' }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!verifyOrderToken(paymentIntentId, token)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    const meta = paymentIntent.metadata as Record<string, string>;
    const items = readItems(meta);

    if (items.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const shipping = paymentIntent.shipping;

    return NextResponse.json(
      {
        paymentIntentId: paymentIntent.id,
        // The raw Stripe status, plus an explicit paid flag. The token is
        // minted at PaymentIntent CREATION, before payment, so an abandoned
        // checkout can still load this page - it must not be presented as a
        // confirmed order.
        status: paymentIntent.status,
        paid: paymentIntent.status === 'succeeded',
        email: paymentIntent.receipt_email ?? '',
        name: shipping?.name ?? '',
        address: shipping?.address?.line1 ?? '',
        city: shipping?.address?.city ?? '',
        state: shipping?.address?.state ?? '',
        zip: shipping?.address?.postal_code ?? '',
        items: items.map(i => ({
          productName: i.p,
          wood: i.w,
          stainName: i.s,
          quantity: i.q,
          unitCents: i.c,
          addons: i.a ?? [],
        })),
        subtotalCents: Number(meta.subtotal_cents || 0),
        shippingCents: Number(meta.shipping_cents || 0),
        taxCents: Number(meta.tax_cents || 0),
        totalCents: Number(meta.total_cents || paymentIntent.amount),
      },
      { headers: { 'Cache-Control': 'no-store, private' } }
    );
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      console.error('orders: payments are not configured.', err.message);
      return NextResponse.json(
        { error: 'Order lookup is unavailable on this deployment.' },
        { status: 503 }
      );
    }
    console.error('getOrder error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
