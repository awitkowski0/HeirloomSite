"use client";

import { capture } from "./posthog-client";

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
 */

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
}

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
}

/* ===========================================================================
 * The purchase funnel.
 *
 * These seven events are ordered, and every one of them fires from exactly
 * one place. Before this there was product_added_to_cart and then
 * checkout_completed with NOTHING in between, so a cart abandoned at the
 * shipping form and one abandoned at the card field were indistinguishable -
 * which is the single question you actually want answered.
 *
 *   1 product_viewed        reached a product page
 *   2 variant_configured    changed wood or stain (intent, not just landing)
 *   3 product_added_to_cart
 *   4 checkout_started      reached /checkout with a non-empty cart
 *   5 shipping_submitted    address validated, PaymentIntent created
 *   6 payment_submitted     pressed pay
 *   7 order_completed       Stripe confirmed
 *
 * checkout_failed carries the step it died at, so a misconfigured deployment
 * and a declined card are not the same row in the dashboard.
 * =========================================================================== */

export function productViewed(props: {
  product_name: string;
  product_category?: string | null;
  price: number;
}) {
  capture("product_viewed", props);
}

export function variantConfigured(props: {
  product_name: string;
  wood: string;
  stain: string;
  /** Which control the visitor touched. */
  field: "wood" | "stain";
}) {
  capture("variant_configured", props);
}

export function checkoutStarted(props: { item_count: number; cart_value: number }) {
  capture("checkout_started", props);
}

export function shippingSubmitted(props: { item_count: number; order_total: number }) {
  capture("shipping_submitted", props);
}

export function paymentSubmitted() {
  capture("payment_submitted");
}

export function orderCompleted(props: { item_count: number; order_total: number }) {
  capture("order_completed", props);
}

/**
 * `step` is the funnel stage that failed and `reason` the cause. Without these
 * a 503 from a deployment missing STRIPE_SECRET_KEY looks exactly like a
 * declined card, and the first is a five-minute fix while the second is not a
 * bug at all.
 */
export function checkoutFailed(props: {
  step: "shipping" | "payment";
  reason: string;
  status?: number;
}) {
  capture("checkout_failed", props);
}

export function contactMessageSubmitted() {
  capture("contact_message_submitted");
}
