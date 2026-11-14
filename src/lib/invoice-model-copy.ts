/**
 * Invoice-model sentences already published on the site (About #25, /faq, /terms).
 * Reused verbatim at every checkout step. Do not paraphrase.
 */
/** About #25 order step 1; also on /faq. */
export const NO_CARD_AT_CHECKOUT = 'No card is taken at checkout.';

/** /faq "How an order works" Confirm Order step. */
export const INVOICE_FOLLOWS =
  'A secure Stripe invoice follows within 48 hours of your order.';

/** /faq Confirm Order step; About #25 order step 3. */
export const CARD_OR_AFFIRM = 'You can pay by credit card or Affirm.';

/** Visible notice at every checkout step, built only from the three published sentences. */
export const INVOICE_MODEL_NOTICE = `${NO_CARD_AT_CHECKOUT} ${INVOICE_FOLLOWS} ${CARD_OR_AFFIRM}`;
