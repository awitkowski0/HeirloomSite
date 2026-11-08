'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

const TERMS: { heading: string; body: ReactNode }[] = [
  {
    heading: '1. Order review and invoice',
    body: 'After you place an order, we review it with you and send an invoice within 48 hours of the order. Nothing is charged until you pay that invoice.',
  },
  {
    heading: '2. Payment',
    body: "We accept credit card and Affirm. Affirm financing is subject to Affirm's terms.",
  },
  {
    heading: '3. Deposit',
    body: 'Custom orders require a 50% deposit of the order total.',
  },
  {
    heading: '4. Cancellation',
    body: 'You may cancel in writing at no cost before the deposit is paid. Once the deposit is received we place the order with the builder, the order can no longer be cancelled, and the deposit is non-refundable.',
  },
  {
    heading: '5. All sales final: no returns',
    body: (
      <>
        Made-to-order case goods (cribs, dressers, nightstands, chests) are built to your
        specifications and cannot be returned or exchanged. Other product types may have a
        different policy, stated on their product page. See{' '}
        <Link href="/returns">Returns, Cancellations &amp; Refunds</Link>.
      </>
    ),
  },
  {
    heading: '6. Balance',
    body: 'The remaining balance must be paid before we schedule final delivery.',
  },
  {
    heading: '7. Delivery',
    body: (
      <>
        Lead times and delivery dates are estimates, confirmed at order time. White Glove includes
        up to 3 flights of stairs. Delivery areas, options and charges are listed on{' '}
        <Link href="/shipping">Delivery</Link>.
      </>
    ),
  },
  {
    heading: '8. Inspection, damage and defects',
    body: 'You must inspect the goods at delivery and note any visible damage on the delivery receipt when you sign it. Concealed defects must be reported to us in writing within 5 business days of delivery. We coordinate repair or replacement with the builder and the claim with the delivery carrier.',
  },
  {
    heading: '9. Warranty',
    body: "Seller makes no independent warranties. The manufacturer's warranty passes through to you.",
  },
];

interface Props {
  agreed: boolean;
  onChange: (agreed: boolean) => void;
}

export default function TermsBlock({ agreed, onChange }: Props) {
  return (
    <section className="terms-section">
      <h2 className="headline-md">Terms &amp; Conditions</h2>
      <div className="terms-scroll" tabIndex={0} role="region" aria-label="Terms and conditions">
        {TERMS.map(({ heading, body }) => (
          <div key={heading}>
            <p className="terms-heading">{heading}</p>
            <p>{body}</p>
          </div>
        ))}
      </div>
      <p className="body-md text-on-surface-variant terms-full-links">
        <Link href="/terms">Terms of Sale</Link>
        {' · '}
        <Link href="/returns">Returns, Cancellations &amp; Refunds</Link>
      </p>

      <div className="terms-agree">
        <input
          id="agree-terms"
          type="checkbox"
          checked={agreed}
          onChange={e => onChange(e.target.checked)}
        />
        <label htmlFor="agree-terms" className="label-large">
          I have read and agree to the Terms of Sale
        </label>
      </div>
    </section>
  );
}
