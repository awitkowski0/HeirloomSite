"use client";

import posthog from "posthog-js";

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
  posthog.capture("product_selected", {
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
  posthog.capture("product_added_to_cart", props);
}

export function cartItemRemoved(props: {
  product_name: string;
  product_category: string;
  item_quantity: number;
}) {
  posthog.capture("cart_item_removed", props);
}

export function searchSubmitted(props: {
  result_count: number;
  search_surface: "desktop" | "mobile";
}) {
  posthog.capture("search_submitted", props);
}

export function checkoutPaymentSubmitted() {
  posthog.capture("checkout_payment_submitted");
}

export function checkoutCompleted(props: {
  item_count: number;
  order_total: number;
}) {
  posthog.capture("checkout_completed", props);
}

export function contactMessageSubmitted() {
  posthog.capture("contact_message_submitted");
}
