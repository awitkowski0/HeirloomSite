/**
 * Invoice-model sentences already published on the site (About #25, /faq, /terms).
 * Reused verbatim at every checkout step and beside Add to cart. Do not paraphrase.
 */
/** /faq "How an order works" Confirm Order step (spec/live Home-FAQ sentence). */
export const NO_CARD_AT_CHECKOUT =
  'No card is taken at checkout — the order is a commitment, not a charge.';

/** /faq "How an order works" Confirm Order step. */
export const INVOICE_FOLLOWS =
  'A secure Stripe invoice follows within 48 hours of your order.';

/** /faq Confirm Order step; About #25 order step 3. */
export const CARD_OR_AFFIRM = 'You can pay by credit card or Affirm.';

/** Visible notice built only from the published FAQ sentences, verbatim. */
export const INVOICE_MODEL_NOTICE = `${NO_CARD_AT_CHECKOUT} ${INVOICE_FOLLOWS} ${CARD_OR_AFFIRM}`;
