"use client";

import { capture, identifyPerson } from "./posthog-client";
import { metaTrack } from "./meta-pixel";
import type { PaymentOption } from "./order-terms";

/**
 * The PostHog event vocabulary, in one place.
 *
 * Every capture call used to be written inline at its call site, which is how
 * the same user action ended up under three different names ('product_click',
 * 'add_to_cart', 'product_view') with three different property shapes
 * (productName vs product_name, source vs no source). PR #77 on dev
 * standardised the vocabulary; routing every event through this module is what
 * keeps it standardised, because adding a new surface now means adding a
 * `source` value rather than inventing a name.
 *
 * Convention: snake_case event names, snake_case properties, `source`
 * identifying the surface the action came from.
 *
 * TWO DESTINATIONS NOW: PostHog, and the Meta Pixel where a standard event
 * exists for what happened. The fan-out lives here rather than at the eight
 * call sites for exactly the reason this module exists at all - a second sink
 * wired in at each call site is how the same action ends up under three names
 * again, and how one surface quietly stops reporting to one of them.
 *
 * Not every event has a Meta counterpart, and inventing one is worse than
 * sending nothing: Meta's standard events are the vocabulary its optimiser is
 * trained on, so a mapping that is merely plausible teaches it the wrong thing.
 * Where the table below says PostHog only, that is a decision, not a gap.
 */

/** Everything on this site is priced in USD; Meta requires it on value events. */
const CURRENCY = "USD";

/** Every surface that can lead a user to a product page. */
export type ProductSource =
  | "gallery_card"
  | "gallery_view_details"
  | "gallery_carousel"
  | "product_listing"
  | "featured_grid"
  | "desktop_search_result"
  | "mobile_search_result";

export function productSelected(props: {
  product_name: string;
  product_category?: string | null;
  source: ProductSource;
}) {
  capture("product_selected", {
    ...props,
    product_category: props.product_category || "Crib",
  });
}

export function productAddedToCart(props: {
  product_name: string;
  wood: string;
  stain: string;
  price: number;
  quantity: number;
}) {
  capture("product_added_to_cart", props);
  metaTrack("AddToCart", {
    content_type: "product",
    content_name: props.product_name,
    value: props.price * props.quantity,
    currency: CURRENCY,
    contents: [{ id: props.product_name, quantity: props.quantity }],
  });
}

/** PostHog only: Meta has no removal event, and there is nothing to optimise for. */
export function cartItemRemoved(props: {
  product_name: string;
  product_category: string;
  item_quantity: number;
}) {
  capture("cart_item_removed", props);
}

export function searchSubmitted(props: {
  result_count: number;
  search_surface: "desktop" | "mobile";
}) {
  capture("search_submitted", props);
  /*
   * Deliberately WITHOUT search_string, which is the one parameter Meta
   * actually wants here. This event has never carried the query - only a count
   * and a surface - and adding free text typed by a visitor so it can be
   * shipped to an ad network is a new class of data leaving this site for no
   * measurement gain. If search terms are ever wanted, that is a decision to
   * take on its own merits, in PostHog first.
   */
  metaTrack("Search", { content_category: "product" });
}

/* ===========================================================================
 * The purchase funnel.
 *
 * These five events are ordered, and every one of them fires from exactly one
 * place. Before this there was product_added_to_cart and then
 * checkout_completed with NOTHING in between, so a cart abandoned at the
 * shipping form and one abandoned at the last step were indistinguishable -
 * which is the single question you actually want answered.
 *
 *   1 product_viewed        reached a product page
 *   2 variant_configured    changed wood or stain (intent, not just landing)
 *   3 product_added_to_cart
 *   4 checkout_started      reached /checkout with a non-empty cart
 *   5 quote_submitted       order recorded as a draft invoice
 *
 * IT ENDS THERE, and that is not an omission. Payment happens on Stripe's
 * hosted invoice page, on Stripe's domain, days later - so this funnel can no
 * longer see revenue at all, and anyone reading the dashboard after the switch
 * from card checkout will otherwise conclude conversions went to zero.
 * Conversion-to-paid lives in Stripe. If it is wanted here, the webhook can
 * capture server-side on invoice.paid.
 *
 * checkout_failed carries the step it died at, so a misconfigured deployment
 * and a rejected cart are not the same row in the dashboard.
 * =========================================================================== */

export function productViewed(props: {
  product_name: string;
  product_category?: string | null;
  price: number;
}) {
  capture("product_viewed", props);
  metaTrack("ViewContent", {
    content_type: "product",
    content_name: props.product_name,
    content_category: props.product_category || "Crib",
    value: props.price,
    currency: CURRENCY,
  });
}

export function variantConfigured(props: {
  product_name: string;
  wood: string;
  stain: string;
  /** Which control the visitor touched. */
  field: "wood" | "stain";
}) {
  capture("variant_configured", props);
  metaTrack("CustomizeProduct", { content_name: props.product_name });
}

/**
 * Identify the visitor the moment a valid email lands in the checkout form -
 * before shipping is filled in, before submit, possibly before they ever
 * finish. Without this, `person_profiles: 'identified_only'` means someone
 * who reaches checkout_started and then abandons stays fully anonymous
 * forever, even though they typed an address we could have emailed.
 *
 * No capture() call here and deliberately no Meta event: identify() alone is
 * enough to retroactively stitch this browser's whole session - including a
 * checkout_started that already fired before the email was typed - onto the
 * person profile. Firing a new named event would be double-counting the
 * funnel step checkout_started already represents. See quoteSubmitted for the
 * production of the same email address as a person property, and
 * identifyPerson's docstring for what calling this actually costs.
 */
export function checkoutEmailEntered(email: string) {
  identifyPerson(email, { email });
}

export function checkoutStarted(props: { item_count: number; cart_value: number }) {
  capture("checkout_started", props);
  metaTrack("InitiateCheckout", {
    num_items: props.item_count,
    value: props.cart_value,
    currency: CURRENCY,
  });
}

export function quoteSubmitted(props: {
  /*
   * Stripped out below rather than captured: it identifies the person, it is
   * not a property of the event. Sending it as both would put a customer's
   * email on an event row as well as a profile, for no gain.
   */
  email: string;
  item_count: number;
  order_total: number;
  /** What the deposit invoice will ask for, which is the number that converts. */
  due_now: number;
  /* Imported rather than restated: this is the property the funnel splits on,
     so a union that drifts from the real one silently drops a whole cohort. */
  payment_option: PaymentOption;
}) {
  const { email, ...rest } = props;
  /*
   * Identify here, and note what it buys: the Stripe webhook knows an order by
   * `invoice.customer_email` and nothing else about the browser that placed it.
   * This one line is what will let a future server-side capture on invoice.paid
   * join back to the session that produced the order - which is the whole
   * deferred revenue-attribution story. It costs nothing to add now and cannot
   * be backfilled later.
   */
  identifyPerson(email, { email });
  capture("quote_submitted", rest);
  /*
   * SubmitApplication - NOT Purchase, and NOT Lead.
   *
   * Not Purchase because it would be false. Read the block above: at this point
   * the invoice is a DRAFT, a person still has to send it, the customer may
   * never pay, and on the deposit path only part of the money is even being
   * asked for. Firing Purchase here would report revenue that frequently never
   * arrives, and would train ad delivery to find people who fill in forms
   * rather than people who buy furniture. Real revenue is only observable in
   * the Stripe webhook, days later, and that is where it belongs.
   *
   * Not Lead because Lead is reserved for the newsletter signup. Ads Manager
   * shows one "Leads" column; pointing two unrelated actions at it produces a
   * number that means nothing and cannot be optimised against.
   */
  metaTrack("SubmitApplication", { value: props.order_total, currency: CURRENCY });
}

/**
 * `step` is the funnel stage that failed and `reason` the cause. Without these
 * a 503 from a deployment missing STRIPE_SECRET_KEY looks exactly like a
 * declined card, and the first is a five-minute fix while the second is not a
 * bug at all.
 */
export function checkoutFailed(props: {
  step: "shipping" | "quote";
  reason: string;
  status?: number;
}) {
  capture("checkout_failed", props);
}

/*
 * PostHog only. This is a mailto: handoff - nothing is submitted to us and we
 * cannot tell whether the message was ever actually sent, so reporting it to
 * Meta as a conversion would optimise for opening a mail client. Lead is also
 * spoken for; see quoteSubmitted.
 */
export function contactMessageSubmitted() {
  capture("contact_message_submitted");
}

/* ===========================================================================
 * Consent, and the email list.
 * =========================================================================== */

/** Where the email capture form was shown. */
export type SubscribeSource = "popup" | "footer";

/** What put the popup on screen. */
export type SubscribeTrigger = "timer" | "exit_intent";

/**
 * A visitor accepted tracking.
 *
 * GRANT ONLY, and this is not an oversight to be tidied up later: a capture
 * describing a refusal is a capture from somebody who just refused to be
 * captured. There is no honest way to record a decline from the browser, so
 * decline rates are invisible here by construction. If that number is genuinely
 * wanted it has to come from a server-side counter, which is a different
 * conversation with a different answer.
 *
 * `prompted` distinguishes a visitor who was actually shown the banner from one
 * in an ungated region who was granted implicitly - without it the two are the
 * same row and the acceptance rate is meaningless.
 */
export function consentGranted(props: { country: string | null; prompted: boolean }) {
  capture("consent_decision", { decision: "granted", ...props });
}

export function emailPopupShown(props: { trigger: SubscribeTrigger }) {
  capture("email_popup_shown", props);
}

export function emailPopupDismissed(props: {
  trigger: SubscribeTrigger;
  /** How long it was on screen. Separates "closed it reflexively" from "read it". */
  seconds_visible: number;
}) {
  capture("email_popup_dismissed", props);
}

/**
 * Someone joined the list.
 *
 * `Lead` is Meta's, and it is spoken for by this event alone - see
 * quoteSubmitted for why nothing else may borrow it.
 *
 * The identify() is what makes the address worth having in PostHog at all: it
 * stitches this person onto everything they browsed before signing up. It is a
 * no-op without consent, which is exactly why the address ALSO goes to a Resend
 * audience server-side - a visitor who declined tracking can still subscribe,
 * and their subscription must not depend on analytics being allowed to run.
 */
export function emailSubscribed(props: {
  email: string;
  source: SubscribeSource;
  trigger?: SubscribeTrigger;
}) {
  const { email, ...rest } = props;
  identifyPerson(email, { email, subscribed_at: new Date().toISOString() });
  capture("email_subscribed", rest);
  metaTrack("Lead", { content_category: "newsletter" });
}

/**
 * Mirrors checkoutFailed's reasoning exactly: a Turnstile rejection, an
 * unconfigured audience and a Resend outage are three different problems with
 * three different fixes, and collapsing them into one "signup failed" row means
 * nobody can tell a bot being blocked from the feature being broken.
 */
export function emailSubscribeFailed(props: { reason: string; status?: number }) {
  capture("email_subscribe_failed", props);
}
