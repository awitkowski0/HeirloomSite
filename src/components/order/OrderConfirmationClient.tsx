'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOrder, type OrderData } from '@/lib/api-client';
import { useCart } from '@/context/useCart';
import { formatPrice, fromCents } from '@/lib/format';
import { variantLabel } from '@/lib/labels';

type State =
  | { kind: 'loading' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; order: OrderData };

/** Copy per Stripe PaymentIntent status. */
function statusPresentation(order: OrderData): { heading: string; blurb: string; tone: string } {
  if (order.paid) {
    return {
      heading: 'Order confirmed',
      blurb: 'Thank you. We have your order and a receipt is on its way to your inbox.',
      tone: 'success',
    };
  }
  switch (order.status) {
    case 'processing':
      return {
        heading: 'Payment processing',
        blurb: 'Your payment is still clearing. We will email you as soon as it completes.',
        tone: 'pending',
      };
    case 'requires_action':
      return {
        heading: 'Action required',
        blurb: 'Your bank needs to authenticate this payment before we can confirm the order.',
        tone: 'pending',
      };
    default:
      return {
        heading: 'Payment not completed',
        blurb: 'This order has not been paid for yet. No charge has been made.',
        tone: 'pending',
      };
  }
}

export default function OrderConfirmationClient({ paymentIntentId }: { paymentIntentId: string }) {
  const { clearCart } = useCart();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    // Resolved inside the async flow so no setState runs synchronously in the
    // effect body. sessionStorage only: the token is a bearer credential and
    // PostHog captures $current_url with its query string, so it must never
    // travel in the URL.
    const load = async () => {
      let token = '';
      try {
        token = sessionStorage.getItem(`order_token_${paymentIntentId}`) || '';
      } catch {
        // Safari private mode or blocked storage.
      }
      if (!token) return { kind: 'unauthorized' } as const;

      try {
        const order = await getOrder(paymentIntentId, token, controller.signal);
        return { kind: 'ready', order } as const;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return null;
        return { kind: 'error', message: (err as Error).message } as const;
      }
    };

    load().then(next => {
      if (next && !controller.signal.aborted) setState(next);
    });

    return () => controller.abort();
  }, [paymentIntentId]);

  /*
   * Empty the cart once the order is confirmed paid.
   *
   * Checkout clears it on the inline path, but a redirect payment method
   * (Klarna, Affirm, Cash App) never returns to that code - the browser leaves
   * the site and comes back here. Those customers were charged and then kept
   * looking at a full cart. Keyed on `paid` rather than on arrival, so an
   * abandoned or failed payment leaves the cart alone.
   */
  const paid = state.kind === 'ready' && state.order.paid;
  useEffect(() => {
    if (paid) clearCart();
  }, [paid, clearCart]);

  if (state.kind === 'loading') {
    return (
      <div className="container narrow-page">
        <p className="body-lg" role="status">Loading your order…</p>
      </div>
    );
  }

  if (state.kind === 'unauthorized' || state.kind === 'error') {
    return (
      <div className="container narrow-page">
        <h1 className="headline-lg">We couldn&rsquo;t load that order</h1>
        <p className="body-lg text-on-surface-variant">
          {state.kind === 'unauthorized'
            ? 'This order can only be opened in the browser session that placed it. Please contact us and we will look it up for you.'
            : state.message}
        </p>
        <div className="not-found-actions">
          <Link href="/contact" className="button-primary">Contact support</Link>
          <Link href="/" className="button-secondary">Back to the showroom</Link>
        </div>
      </div>
    );
  }

  const { order } = state;
  const { heading, blurb, tone } = statusPresentation(order);

  return (
    <div className="container order-page">
      {/*
        The heading reflects the real PaymentIntent status. It was previously a
        hardcoded "Order Confirmed!" with the actual status buried in a detail
        row - and because the token is minted at intent creation, before
        payment, an abandoned checkout rendered as a confirmed order.
      */}
      <header className={`order-status order-status--${tone}`}>
        <span className="material-symbols-outlined" aria-hidden="true">
          {order.paid ? 'check_circle' : 'schedule'}
        </span>
        <h1 className="headline-lg">{heading}</h1>
        <p className="body-lg">{blurb}</p>
      </header>

      <section className="order-block">
        <h2 className="headline-md">Order details</h2>
        <dl className="order-detail-list">
          <div>
            <dt className="label-caps text-on-surface-variant">Order ID</dt>
            <dd className="body-md">{order.paymentIntentId}</dd>
          </div>
          <div>
            <dt className="label-caps text-on-surface-variant">Status</dt>
            <dd className="body-md order-detail-status">{order.status.replace(/_/g, ' ')}</dd>
          </div>
          {order.email && (
            <div>
              <dt className="label-caps text-on-surface-variant">Email</dt>
              <dd className="body-md">{order.email}</dd>
            </div>
          )}
          {order.name && (
            <div>
              <dt className="label-caps text-on-surface-variant">Ship to</dt>
              <dd className="body-md">
                {order.name}
                <br />
                {order.address}
                <br />
                {order.city}, {order.state} {order.zip}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="order-block">
        <h2 className="headline-md">Items</h2>
        <ul className="order-items">
          {order.items.map((item, i) => (
            <li key={`${item.productName}-${item.wood}-${item.stainName}-${i}`}>
              <div className="order-item-detail">
                <h3 className="body-lg">{item.productName}</h3>
                {variantLabel(item.wood, item.stainName) && (
                  <p className="label-caps text-on-surface-variant">
                  {variantLabel(item.wood, item.stainName)}
                </p>
                )}
                {item.addons.length > 0 && (
                  <p className="label-caps text-on-surface-variant">
                    Add-ons: {item.addons.join(', ')}
                  </p>
                )}
              </div>
              <p className="body-md">
                {formatPrice(fromCents(item.unitCents))} &times; {item.quantity}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="order-block">
        <h2 className="headline-md">Payment summary</h2>
        <dl className="order-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatPrice(fromCents(order.subtotalCents))}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>{formatPrice(fromCents(order.shippingCents))}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{formatPrice(fromCents(order.taxCents))}</dd>
          </div>
          <div className="order-total-row">
            <dt className="headline-md">Total</dt>
            <dd className="headline-md text-primary">{formatPrice(fromCents(order.totalCents))}</dd>
          </div>
        </dl>
      </section>

      <div className="not-found-actions">
        <Link href="/products" className="button-primary">Continue shopping</Link>
        <Link href="/contact" className="button-secondary">Questions? Contact us</Link>
      </div>
    </div>
  );
}
