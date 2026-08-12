'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/useCart';
import { createPaymentIntent, type OrderTotals } from '@/lib/api-client';
import { formatPrice, fromCents, toCents } from '@/lib/format';
import { variantLabel } from '@/lib/labels';
import {
  cartItemRemoved,
  checkoutFailed,
  checkoutStarted,
  orderCompleted,
  shippingSubmitted,
} from '@/lib/analytics';
import ShippingForm, {
  EMPTY_SHIPPING,
  validateShipping,
  type ShippingValues,
} from './ShippingForm';
import TermsBlock from './TermsBlock';
import PaymentSection from './PaymentSection';

// Must match src/lib/pricing.ts, which is the authority: this is only the
// estimate shown before the server returns real totals. Delivery is included
// in the product price.
const SHIPPING_CENTS = 0;
const TAX_RATE = 0.08;

export default function CheckoutClient() {
  const { cart, hydrated, subtotal, clearCart, removeFromCart } = useCart();
  const router = useRouter();

  const [shipping, setShipping] = useState<ShippingValues>(EMPTY_SHIPPING);
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingValues, string>>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [clientSecret, setClientSecret] = useState('');
  const [orderToken, setOrderToken] = useState('');
  const [serverTotals, setServerTotals] = useState<OrderTotals | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  /*
   * Funnel step 4, fired once.
   *
   * Gated on `hydrated` because the server renders an empty cart, so firing on
   * mount would record every visit as a zero-item checkout. The ref stops it
   * re-firing when a line is removed, which would otherwise inflate the step
   * above the number of people who actually reached it.
   */
  const startedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || startedRef.current || cart.length === 0) return;
    startedRef.current = true;
    checkoutStarted({
      item_count: cart.reduce((n, i) => n + i.quantity, 0),
      cart_value: subtotal,
    });
  }, [hydrated, cart, subtotal]);

  // Estimates only, replaced by the server's numbers once the intent exists.
  const estSubtotalCents = toCents(subtotal);
  const estTaxCents = Math.round(estSubtotalCents * TAX_RATE);
  const estTotalCents = estSubtotalCents + (cart.length > 0 ? SHIPPING_CENTS : 0) + estTaxCents;

  const totals: OrderTotals = serverTotals ?? {
    subtotalCents: estSubtotalCents,
    shippingCents: cart.length > 0 ? SHIPPING_CENTS : 0,
    taxCents: estTaxCents,
    totalCents: estTotalCents,
  };

  /**
   * Create the PaymentIntent on submit.
   *
   * Previously this ran in a mount effect keyed on every form field. On mount
   * all seven shipping fields were empty, the server rejected the request, the
   * .catch set `error`, and the effect's own guard
   * `if (clientSecret || error || ...) return` then short-circuited forever
   * because nothing ever reset `error`. clientSecret was never set, so the
   * payment form never rendered and no customer could pay.
   */
  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateShipping(shipping);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Move focus to the first invalid field for keyboard and SR users.
      const firstKey = Object.keys(validationErrors)[0];
      document.getElementById(firstKey)?.focus();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSubmitting(true);
    setError(''); // Errors are recoverable: retrying clears the previous one.

    try {
      const data = await createPaymentIntent(
        {
          cart: cart.map(item => ({
            productName: item.productName,
            wood: item.wood,
            stainName: item.stainName,
            quantity: item.quantity,
            addons: item.addons?.map(a => ({ name: a.name })),
          })),
          ...shipping,
        },
        controller.signal
      );
      setClientSecret(data.clientSecret);
      setOrderToken(data.token);
      setServerTotals(data.totals);
      // Funnel step 5: the address validated and Stripe accepted the intent.
      shippingSubmitted({
        item_count: cart.reduce((n, i) => n + i.quantity, 0),
        order_total: fromCents(data.totals.totalCents),
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message = (err as Error).message || 'Could not start checkout. Please try again.';
      checkoutFailed({ step: 'shipping', reason: message });
      setError(message);
    } finally {
      if (!controller.signal.aborted) setSubmitting(false);
    }
  };

  const handleSuccess = (paymentIntentId: string) => {
    // Captured before clearCart(), which empties the array these read from, and
    // from the server-authoritative total rather than the client estimate.
    orderCompleted({
      item_count: cart.reduce((count, item) => count + item.quantity, 0),
      order_total: fromCents(totals.totalCents),
    });
    clearCart();
    try {
      // Handed to the confirmation page through sessionStorage rather than the
      // URL: the token is a bearer credential for an endpoint returning name,
      // street address and email, and PostHog captures $current_url on every
      // pageview, so a query parameter shipped it to a third party.
      sessionStorage.setItem(`order_token_${paymentIntentId}`, orderToken);
    } catch {
      // Falls back to the query parameter below if storage is unavailable.
    }
    router.push(`/order-confirmation/${paymentIntentId}`);
  };

  // Gate on `hydrated`, not on cart.length: the server renders an empty cart,
  // so without this every visitor sees "your cart is empty" before their real
  // cart loads.
  if (!hydrated) {
    return (
      <div className="container narrow-page">
        <p className="body-lg text-on-surface-variant">Loading your cart…</p>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container narrow-page">
        <h1 className="headline-lg">Your cart is empty</h1>
        <p className="body-lg">
          Start exploring our handcrafted collection to build your legacy.
        </p>
        <div className="not-found-actions">
          <Link href="/gallery" className="button-primary">Browse Gallery</Link>
          <Link href="/products" className="button-secondary">All Products</Link>
        </div>
      </div>
    );
  }

  const detailsLocked = Boolean(clientSecret);

  return (
    <div className="container checkout-page">
      <h1 className="headline-lg">Checkout</h1>
      <div className="grid-layout">
        <div className="product-showcase">
          <div className="checkout-secure">
            <span className="label-caps text-on-surface-variant">Secure checkout</span>
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">lock</span>
          </div>

          <form onSubmit={handleSubmitDetails} noValidate>
            <ShippingForm
              values={shipping}
              errors={errors}
              disabled={detailsLocked || submitting}
              onChange={(field, value) => {
                setShipping(prev => ({ ...prev, [field]: value }));
                setErrors(prev => ({ ...prev, [field]: undefined }));
              }}
            />

            {error && (
              <div className="checkout-error" role="alert">
                <p>{error}</p>
              </div>
            )}

            {!detailsLocked && (
              <button type="submit" className="add-to-cart checkout-continue" disabled={submitting}>
                {submitting ? 'Preparing payment…' : 'Continue to payment'}
              </button>
            )}
          </form>

          {detailsLocked && (
            <button
              type="button"
              className="button-secondary checkout-edit"
              onClick={() => {
                // Editing details invalidates the intent; a new one is created
                // on the next submit.
                setClientSecret('');
                setOrderToken('');
                setServerTotals(null);
              }}
            >
              Edit shipping details
            </button>
          )}

          <TermsBlock agreed={agreedToTerms} onChange={setAgreedToTerms} />

          {clientSecret && (
            <PaymentSection
              clientSecret={clientSecret}
              agreedToTerms={agreedToTerms}
              returnUrl={
                typeof window !== 'undefined'
                  ? `${window.location.origin}/order-confirmation/pending`
                  : ''
              }
              onSuccess={handleSuccess}
            />
          )}
        </div>

        <div className="configuration-panel">
          <div className="order-summary">
            <h2 className="headline-md">Order Summary</h2>
            <ul className="order-summary-items">
              {cart.map(item => (
                <li key={item.id}>
                  <div className="order-summary-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 80px
                        cart thumbnail. */}
                    {item.image ? <img src={item.image} alt="" /> : null}
                  </div>
                  <div className="order-summary-detail">
                    <h3 className="body-lg">{item.productName}</h3>
                    <p className="label-caps text-on-surface-variant">
                      {variantLabel(item.wood, item.stainName)}
                    </p>
                    <p className="body-md">
                      {formatPrice(item.price)} &times; {item.quantity}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      cartItemRemoved({
                        product_name: item.productName,
                        product_category: item.wood,
                        item_quantity: item.quantity,
                      });
                      removeFromCart(item.id);
                    }}
                    className="icon-btn"
                    aria-label={`Remove ${item.productName} from cart`}
                    disabled={detailsLocked}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">close</span>
                  </button>
                </li>
              ))}
            </ul>

            <dl className="order-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(fromCents(totals.subtotalCents))}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                {/* "$0.00" invites the question; "Included" answers it. */}
                <dd>
                  {totals.shippingCents === 0
                    ? 'Included'
                    : formatPrice(fromCents(totals.shippingCents))}
                </dd>
              </div>
              <div>
                <dt>{serverTotals ? 'Tax' : 'Estimated tax'}</dt>
                <dd>{formatPrice(fromCents(totals.taxCents))}</dd>
              </div>
              <div className="order-total-row">
                <dt className="headline-md">Total</dt>
                <dd className="headline-md text-primary">
                  {formatPrice(fromCents(totals.totalCents))}
                </dd>
              </div>
            </dl>

            {!serverTotals && (
              <p className="checkout-hint">
                Totals are confirmed when you continue to payment.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
