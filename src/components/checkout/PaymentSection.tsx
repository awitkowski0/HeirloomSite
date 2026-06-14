interface Props {
  clientSecret: string;
  token: string;
  agreedToTerms: boolean;
  onSuccess: (paymentIntentId: string, token: string) => void;
}

import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

function StripeForm({ token, onSuccess }: { token: string, onSuccess: (paymentIntentId: string, token: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      alert(error.message);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id, token);
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <PaymentElement />
      <button type="submit" className="add-to-cart"
        disabled={isProcessing || !stripe || !elements}
        style={{ width: '100%', marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
        <span>{isProcessing ? "PROCESSING..." : "PAY SECURELY WITH STRIPE"}</span>
        {!isProcessing && <span className="material-symbols-outlined">lock</span>}
      </button>
    </form>
  );
}

export default function PaymentSection({ clientSecret, token, agreedToTerms, onSuccess }: Props) {
  return (
    <section style={{ padding: '32px', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', boxShadow: 'var(--shadow-ambient)', border: '1px solid var(--surface-container-highest)' }}>
      <h2 className="headline-md" style={{ marginBottom: '24px' }}>Terms &amp; Conditions</h2>
      <div style={{
        backgroundColor: 'var(--surface-container-highest)', padding: '24px', borderRadius: '12px',
        marginBottom: '24px', maxHeight: '200px', overflowY: 'auto', fontSize: '13px',
        lineHeight: '1.6', color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>1. Refund &amp; Cancellation Policy</p>
        <p style={{ marginBottom: '16px' }}>Buyer may cancel for a full refund (less any credit-card fees) within 48 hours of the order date by written notice only.</p>
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>2. All Sales Final / No Returns</p>
        <p style={{ marginBottom: '16px' }}>Custom orders are built to Buyer's exact specifications.</p>
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>3. Deposit Requirement</p>
        <p style={{ marginBottom: '16px' }}>A minimum 50% non-refundable deposit of the total order price is required.</p>
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>4. Delivery Terms</p>
        <p style={{ marginBottom: '16px' }}>Delivery date is estimated only.</p>
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>5. Inspection and Acceptance</p>
        <p style={{ marginBottom: '16px' }}>Buyer must inspect goods immediately upon delivery.</p>
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>6. Limited Warranty</p>
        <p>Seller makes no independent warranties.</p>
      </div>

      {clientSecret && (
        <div style={{ opacity: agreedToTerms ? 1 : 0.5, pointerEvents: agreedToTerms ? 'auto' : 'none' }}>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat' } }}>
            <StripeForm token={token} onSuccess={onSuccess} />
          </Elements>
        </div>
      )}
    </section>
  );
}
