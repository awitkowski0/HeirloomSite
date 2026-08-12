'use client';

const TERMS = [
  ['1. Refund & Cancellation Policy', 'Buyer may cancel for a full refund (less any credit-card fees) within 48 hours of the order date by written notice only.'],
  ['2. All Sales Final / No Returns', "Custom orders are built to Buyer's exact specifications."],
  ['3. Deposit Requirement', 'A minimum 50% non-refundable deposit of the total order price is required.'],
  ['4. Delivery Terms', 'Delivery date is estimated only.'],
  ['5. Inspection and Acceptance', 'Buyer must inspect goods immediately upon delivery.'],
  ['6. Limited Warranty', 'Seller makes no independent warranties.'],
] as const;

interface Props {
  agreed: boolean;
  onChange: (agreed: boolean) => void;
}

export default function TermsBlock({ agreed, onChange }: Props) {
  return (
    <section className="terms-section">
      <h2 className="headline-md">Terms &amp; Conditions</h2>
      <div className="terms-scroll" tabIndex={0} role="region" aria-label="Terms and conditions">
        {TERMS.map(([heading, body]) => (
          <div key={heading}>
            <p className="terms-heading">{heading}</p>
            <p>{body}</p>
          </div>
        ))}
      </div>

      <div className="terms-agree">
        <input
          id="agree-terms"
          type="checkbox"
          checked={agreed}
          onChange={e => onChange(e.target.checked)}
        />
        <label htmlFor="agree-terms" className="label-large">
          I have read and agree to the Refund and Cancellation Policy
        </label>
      </div>
    </section>
  );
}
