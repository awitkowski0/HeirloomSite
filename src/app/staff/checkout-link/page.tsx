import type { Metadata } from 'next';
import FillLinkBuilder from '@/components/checkout/FillLinkBuilder';

/*
 * Staff tool: build a fill link to send a customer after talking an order
 * through in chat. Not linked from anywhere on the site and noindex. It holds
 * no secret and calls no API: it only builds a link anyone could write by
 * hand, which the customer's checkout validates and the customer reviews
 * before placing.
 *
 * Not under /checkout/: src/proxy.ts rewrites every /checkout/<segment> to
 * the Merchant Center deep link (/checkout/buy), so a page there is
 * unreachable. Not in robots.txt either: a crawler that may not fetch the
 * page never sees its noindex.
 */
export const metadata: Metadata = {
  title: 'Make a checkout fill link',
  robots: { index: false, follow: false },
};

export default function CheckoutFillPage() {
  return (
    <div className="container checkout-page">
      <h1 className="headline-lg">Make a checkout fill link</h1>
      <p className="body-md text-on-surface-variant fill-intro">
        For staff, after talking an order through in chat. Fill in what the customer told you, copy the link and send
        it in the chat. It opens their checkout with these details filled in. Their cart stays as they built it, so ask
        them to change anything there themselves. They still tick the terms and place the order.
      </p>
      <FillLinkBuilder />
    </div>
  );
}
