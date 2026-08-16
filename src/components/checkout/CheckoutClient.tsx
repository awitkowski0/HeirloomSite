'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/useCart';
import { createQuote, type CreateQuoteResponse, type OrderTotals } from '@/lib/api-client';
import { formatPrice, fromCents, toCents } from '@/lib/format';
import { MAX_QUANTITY_PER_LINE } from '@/lib/cart-limits';
import {
  DEFAULT_SHIPPING_METHOD,
  SHIPPING_METHODS,
  SHIPPING_LIMIT_NOTE,
  TAXED_STATE,
  shippingCentsFor,
  splitPayment,
  taxCentsFor,
  type PaymentOption,
  type ShippingMethodId,
} from '@/lib/order-terms';
import { variantLabel } from '@/lib/labels';
import {
  cartItemRemoved,
  checkoutFailed,
  checkoutStarted,
  quoteSubmitted,
} from '@/lib/analytics';
import ShippingForm, { validateShipping, type ShippingValues } from './ShippingForm';
import TermsBlock from './TermsBlock';
import TurnstileWidget, { type TurnstileHandle, type TurnstileStatus } from './TurnstileWidget';
import {
  clearShippingValues,
  getShippingSnapshot,
  getShippingServerSnapshot,
  setShippingValues,
  subscribeShipping,
} from './shippingStorage';
import AlsoLike, { type Recommendation } from './AlsoLike';

interface Props {
  /** productName -> its bundle items, from the build-time catalogue. */
  recommendations: Record<string, Recommendation[]>;
}

export default function CheckoutClient({ recommendations }: Props) {
  const { cart, hydrated, subtotal, clearCart, removeFromCart, updateQuantity } = useCart();

  /*
   * The form survives a reload, via the same external-store pattern as the cart.
   *
   * Retyping a name, an email and a street address is the most tedious thing
   * this site asks anyone to do, and it was thrown away by every reload -
   * including the reload the checkout itself tells you to perform when the
   * browser check fails.
   */
  const shipping = useSyncExternalStore(
    subscribeShipping,
    getShippingSnapshot,
    getShippingServerSnapshot
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingValues, string>>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  /*
   * Starts 'pending', not 'disabled': until the widget has reported, we do not
   * know whether this deployment gates checkout, and guessing "no" would be
   * the guess that lets an unverified submit through. The widget reports on
   * mount, so the closed state lasts a tick when Turnstile is not configured.
   */
  const [turnstileStatus, setTurnstileStatus] = useState<TurnstileStatus>('pending');

  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethodId>(DEFAULT_SHIPPING_METHOD);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('deposit');
  /* Set once the quote is accepted. Its presence IS the success state - there
     is no payment step to advance to and no order page to navigate away to. */
  const [quote, setQuote] = useState<CreateQuoteResponse | null>(null);
  /*
   * The address the confirmation went to, captured at submit.
   *
   * NOT read off `shipping` on the success screen. The form is a store now, and
   * a successful submit clears it - so by the time this screen renders, the
   * live value is empty and the sentence read "We've emailed a copy to ."
   * This is a snapshot of what was actually sent to, which is what the
   * sentence claims anyway.
   */
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [serverTotals, setServerTotals] = useState<OrderTotals | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  /* Turnstile tokens are single-use and /api/quotes spends one before it prices
     the cart, so every rejection leaves us holding a dead token. See the catch
     below and the note on TurnstileHandle. */
  const turnstileRef = useRef<TurnstileHandle>(null);

  /*
   * The form survives a reload.
   *
   * Restored in an effect rather than a lazy useState initialiser: the server
   * renders these fields empty, so seeding state from localStorage during
   * render is a hydration mismatch. `restored` gates the writer below so the
   * first pass cannot save an empty form over a stored one.
   *
   * Terms acceptance is deliberately NOT restored. It is the evidence that
   * matters in a chargeback, so it has to be an act the customer performs on
   * the order they are actually placing - not a checkbox a previous session
   * left ticked.
   */
  /*
   * Terms acceptance is deliberately NOT persisted. It is the evidence that
   * matters in a chargeback, so it has to be an act the customer performs on
   * the order they are actually placing - not a checkbox a previous session
   * left ticked.
   */

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

  /*
   * Estimates only, replaced by the server's numbers once the intent exists.
   *
   * The rate itself is no longer duplicated here: this calls the same
   * taxCentsFor() that src/lib/pricing.ts calls, so the summary and the amount
   * charged cannot disagree about the rate. They can still disagree about
   * PRICES, because a cart line carries the price snapshotted into
   * localStorage at add-to-cart time - which is exactly what serverTotals
   * overriding this is for.
   */
  const estSubtotalCents = toCents(subtotal);
  const estShippingCents = cart.length > 0 ? shippingCentsFor(shippingMethod) : 0;
  const estTaxCents = taxCentsFor(shipping.state, estSubtotalCents + estShippingCents);
  const estTotalCents = estSubtotalCents + estShippingCents + estTaxCents;

  const split = splitPayment(
    (serverTotals ?? { totalCents: estTotalCents }).totalCents,
    paymentOption
  );

  const totals: OrderTotals = serverTotals ?? {
    subtotalCents: estSubtotalCents,
    shippingCents: estShippingCents,
    taxCents: estTaxCents,
    totalCents: estTotalCents,
  };

  /**
   * Submit the order.
   *
   * Runs on submit, never in an effect. Previously the equivalent ran in a
   * mount effect keyed on every form field: on mount all seven shipping fields
   * were empty, the server rejected the request, the .catch set `error`, and
   * the effect's own guard then short-circuited forever because nothing ever
   * reset `error` - so the checkout could never be completed at all.
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
      const data = await createQuote(
        {
          /*
           * Explicit fields, not a spread. `includes` must never reach the
           * server: priceCart() re-prices every line from the catalogue, so a
           * rail kit sent as a line would be charged at its own price - the
           * $910-per-crib double-charge all over again. It is display-only.
           */
          cart: cart.map(item => ({
            productName: item.productName,
            wood: item.wood,
            stainName: item.stainName,
            quantity: item.quantity,
            addons: item.addons?.map(a => ({ name: a.name })),
          })),
          ...shipping,
          agreedToTerms,
          shippingMethod,
          paymentOption,
          turnstileToken,
        },
        controller.signal
      );
      setServerTotals(data.totals);
      setQuote(data);
      quoteSubmitted({
        item_count: cart.reduce((n, i) => n + i.quantity, 0),
        order_total: fromCents(data.totals.totalCents),
        due_now: fromCents(data.dueNowCents),
        payment_option: paymentOption,
      });
      /*
       * Cleared on submission, not on payment.
       *
       * The cart's job is finished the moment the order is recorded - and it
       * is recorded: the quote is a draft invoice in Stripe before this
       * resolves. Nothing is charged yet, and waiting for that would leave a
       * full cart sitting behind an order the shop is already working on.
       */
      setConfirmationEmail(shipping.email);
      clearCart();
      /*
       * Cleared with the cart, and for the same reason: the order is recorded,
       * so the details have done their job. Leaving a name, an email and a
       * street address in localStorage after checkout would outlive any reason
       * to keep them - and this is a browser a household shares.
       */
      clearShippingValues();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message = (err as Error).message || 'Could not submit your order. Please try again.';
      checkoutFailed({ step: 'quote', reason: message });
      setError(message);
      /*
       * The token is spent whatever went wrong, because verifyTurnstile runs
       * first. Without this the retry resends it, siteverify answers
       * `timeout-or-duplicate`, and a recoverable 400 ("that stain is no longer
       * available") turns into a permanent 403 that only a page reload clears.
       */
      turnstileRef.current?.reset();
    } finally {
      if (!controller.signal.aborted) setSubmitting(false);
    }
  };

  /*
   * Submitted. This is terminal - there is no payment step to advance to.
   *
   * Checked before the empty-cart branch below, because submitting clears the
   * cart and would otherwise drop the customer onto "your cart is empty"
   * immediately after they ordered.
   */
  if (quote) {
    return (
      <div className="container narrow-page checkout-done">
        <h1 className="headline-lg">Order received</h1>
        <p className="body-lg">
          Thank you. Your reference is <strong>{quote.orderRef}</strong>.
        </p>
        {/*
          Says plainly that no money moved. The invoice is a draft until a
          person reviews it, so there is nothing payable to link to yet - and a
          customer who has just filled in a checkout form reasonably assumes
          they have been charged unless told otherwise.
        */}
        <p className="body-md">
          <strong>Nothing has been charged.</strong> We&rsquo;re reviewing your order now and
          will email an invoice from Stripe, usually within one business day.
          {quote.dueLaterCents > 0 ? (
            <>
              {' '}
              Your deposit of {formatPrice(fromCents(quote.dueNowCents))} is due when it
              arrives; the remaining {formatPrice(fromCents(quote.dueLaterCents))} is
              invoiced once staining is complete.
            </>
          ) : (
            <> The full {formatPrice(fromCents(quote.dueNowCents))} is due when it arrives.</>
          )}
        </p>
        {/*
          Conditional, because the send genuinely may not have happened: the
          server skips the customer email while Turnstile is unconfigured in
          production, and src/lib/email.ts returns false when Resend is not
          configured at all. Claiming an email that never left is worse than
          admitting it - the customer would wait for it instead of writing down
          the reference, which in that case is the only record they have.
        */}
        {quote.confirmationSent ? (
          <p className="body-md">
            We&rsquo;ve emailed a copy to <strong>{confirmationEmail}</strong>.
          </p>
        ) : (
          <p className="body-md">
            Please keep your reference <strong>{quote.orderRef}</strong> — we could not
            send a confirmation email, so this page is your copy. We have your order and
            will be in touch.
          </p>
        )}
        <div className="not-found-actions">
          <Link href="/products/cribs" className="button-primary">Keep browsing</Link>
          <Link href="/contact" className="button-secondary">Contact us</Link>
        </div>
      </div>
    );
  }

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
          <Link href="/products/cribs" className="button-primary">Browse Cribs</Link>
          <Link href="/products" className="button-secondary">All Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container checkout-page">
      <h1 className="headline-lg">Checkout</h1>
      <div className="grid-layout">
        <div className="product-showcase">
          <div className="checkout-secure">
            <span className="label-caps text-on-surface-variant">No payment taken today</span>
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">lock</span>
          </div>

          <form onSubmit={handleSubmitDetails} noValidate>
            <ShippingForm
              values={shipping}
              errors={errors}
              disabled={submitting}
              onChange={(field, value) => {
                setShippingValues({ ...shipping, [field]: value });
                setErrors(prev => ({ ...prev, [field]: undefined }));
              }}
              /* One write for all four fields, so the summary and the stored
                 copy never see a half-applied address. */
              onSelectAddress={parts => {
                setShippingValues({ ...shipping, ...parts });
                setErrors(prev => ({
                  ...prev,
                  address: undefined,
                  city: undefined,
                  state: undefined,
                  zip: undefined,
                }));
              }}
            />

            {error && (
              <div className="checkout-error" role="alert">
                <p>{error}</p>
              </div>
            )}

            {/* Above the submit, not below it: acceptance is a precondition of
                recording the order, so asking for it after the button would
                strand the customer on a server error pointing at a checkbox
                further down the page. */}
            {/*
              The deposit is the default because the terms require it: "a
              minimum 50% non-refundable deposit". Paying in full is offered
              because some people would rather not have a second invoice
              arriving in two months.
            */}
            {/*
              Delivery is a paid choice, not a free inclusion.
              
              Above the payment options deliberately: it CHANGES the total, so
              asking "how would you like to pay" before the amount is settled
              would quote a deposit against a number that is about to move.
            */}
            <fieldset className="checkout-fieldset deposit-choice" disabled={submitting}>
              <legend className="headline-md">Shipping method</legend>
              {SHIPPING_METHODS.map(method => (
                <label
                  key={method.id}
                  className="deposit-option"
                  data-selected={shippingMethod === method.id}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={method.id}
                    checked={shippingMethod === method.id}
                    onChange={() => setShippingMethod(method.id)}
                  />
                  <span className="deposit-option-body">
                    <span className="body-lg">
                      {method.name} — {formatPrice(fromCents(method.cents))}
                    </span>
                    <span className="body-md text-on-surface-variant">{method.description}</span>
                  </span>
                </label>
              ))}
              {/* Applies to both tiers, so it sits under the pair. */}
              <p className="body-md text-on-surface-variant shipping-limit-note">
                {SHIPPING_LIMIT_NOTE}
              </p>
            </fieldset>

            <fieldset className="checkout-fieldset deposit-choice" disabled={submitting}>
              <legend className="headline-md">How you&rsquo;d like to pay</legend>
              {(
                [
                  {
                    value: 'deposit' as const,
                    label: '50% deposit now',
                    note: `${formatPrice(fromCents(splitPayment(totals.totalCents, 'deposit').dueNowCents))} now · ${formatPrice(fromCents(splitPayment(totals.totalCents, 'deposit').dueLaterCents))} invoiced when staining is complete`,
                  },
                  {
                    value: 'full' as const,
                    label: 'Pay in full',
                    note: `${formatPrice(fromCents(totals.totalCents))} on one invoice`,
                  },
                ]
              ).map(option => (
                <label
                  key={option.value}
                  className="deposit-option"
                  data-selected={paymentOption === option.value}
                >
                  <input
                    type="radio"
                    name="paymentOption"
                    value={option.value}
                    checked={paymentOption === option.value}
                    onChange={() => setPaymentOption(option.value)}
                  />
                  <span className="deposit-option-body">
                    <span className="body-lg">{option.label}</span>
                    <span className="body-md text-on-surface-variant">{option.note}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <TermsBlock agreed={agreedToTerms} onChange={setAgreedToTerms} />

            {/* Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */}
            <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} onStatus={setTurnstileStatus} />

            {/*
              Says which of the two problems it is.
              
              The server rejects an empty token with 403 "Verification failed.
              Please try again." - true, unhelpful, and unactionable when the
              cause is a content blocker, because trying again does the same
              nothing. The submit is blocked here instead, before the request,
              and names the fix.
            */}
            {turnstileStatus === 'error' && (
              <div className="checkout-error" role="alert">
                <p>
                  We could not load the browser check that protects this form. It is
                  usually a privacy extension or ad blocker. Allow
                  challenges.cloudflare.com for this page and reload, or{' '}
                  <Link href="/contact">contact us</Link> and we will take your order
                  directly.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="add-to-cart checkout-continue"
              /*
               * Gated on the check having passed, so a submit that the server
               * is certain to reject with a 403 is never made. 'disabled'
               * means Turnstile is not configured on this deployment, which is
               * not the customer's problem and must not block them.
               */
              disabled={
                submitting ||
                !agreedToTerms ||
                turnstileStatus === 'pending' ||
                turnstileStatus === 'error'
              }
            >
              {submitting
                ? 'Sending your order…'
                : turnstileStatus === 'pending'
                  ? 'Checking your browser…'
                  : 'Place order'}
            </button>
          </form>


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
                    {variantLabel(item.wood, item.stainName) && (
                      <p className="label-caps text-on-surface-variant">
                        {variantLabel(item.wood, item.stainName)}
                      </p>
                    )}
                    <p className="body-md">{formatPrice(item.price)}</p>
                    {/*
                      What arrives with this line, already inside its price.
                      
                      Listed so the cart shows the whole order rather than
                      leaving a buyer to wonder whether the rails they read
                      about on the product page are actually coming. No remove
                      control and no price, because neither is true of them:
                      they are not separate lines and they are not extra.
                    */}
                    {item.includes && item.includes.length > 0 && (
                      <ul className="order-summary-includes">
                        {item.includes.map(inc => (
                          <li key={inc.productName}>
                            <span className="body-md">{inc.productName}</span>
                            <span className="label-caps text-on-surface-variant">Included</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* The cart had no quantity control anywhere on the site -
                        updateQuantity was written, typed and exported with no
                        call site - so a line could only reach 2 by adding the
                        product again, and could only ever be removed, never
                        reduced. */}
                    <div className="qty-stepper">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={submitting || item.quantity <= 1}
                        aria-label={`Decrease quantity of ${item.productName}`}
                      >
                        &minus;
                      </button>
                      <span aria-live="polite" aria-label={`Quantity: ${item.quantity}`}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={submitting || item.quantity >= MAX_QUANTITY_PER_LINE}
                        aria-label={`Increase quantity of ${item.productName}`}
                      >
                        +
                      </button>
                    </div>
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
                    disabled={submitting}
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
                <dt>
                  {SHIPPING_METHODS.find(m => m.id === shippingMethod)?.name ?? 'Delivery'}
                </dt>
                <dd>{formatPrice(fromCents(totals.shippingCents))}</dd>
              </div>
              {/*
                The label carries the reason. Sales tax is charged only where
                the shop has nexus, so for most customers this row is $0.00 -
                and an unexplained zero reads as something that has not
                calculated yet rather than a number.
              */}
              <div>
                <dt>
                  {shipping.state === ''
                    ? 'Estimated tax'
                    : shipping.state === TAXED_STATE
                      ? `Sales tax (${TAXED_STATE} 6%)`
                      : `Sales tax (none outside ${TAXED_STATE})`}
                </dt>
                <dd>{formatPrice(fromCents(totals.taxCents))}</dd>
              </div>
              <div className="order-total-row">
                <dt className="headline-md">Order total</dt>
                <dd className="headline-md text-primary">
                  {formatPrice(fromCents(totals.totalCents))}
                </dd>
              </div>
              {/* What the first invoice will actually ask for. The order total
                  above is what they are buying; this is what they owe now, and
                  conflating the two is how a deposit becomes a surprise. */}
              <div className="order-total-row">
                <dt className="headline-md">Due now</dt>
                <dd className="headline-md text-primary">
                  {formatPrice(fromCents(split.dueNowCents))}
                </dd>
              </div>
              {split.dueLaterCents > 0 && (
                <div className="order-total-row order-total-row--muted">
                  <dt className="body-lg">Due at completion</dt>
                  <dd className="body-lg">{formatPrice(fromCents(split.dueLaterCents))}</dd>
                </div>
              )}
            </dl>

            {!serverTotals && (
              <p className="checkout-hint">
                Totals are confirmed on the invoice we send you.
              </p>
            )}
          </div>

          {/*
            Below the summary, never above the total: this is a reminder about
            parts, not a merchandising unit, and it must not push the number
            the buyer came here to check below the fold. Locked while the
            order is submitting, like every other control that would change
            the amount.
          */}
          <AlsoLike recommendations={recommendations} disabled={submitting} />
        </div>
      </div>
    </div>
  );
}
