'use client';

import { useMemo, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe-client';

interface Props {
  clientSecret: string;
  agreedToTerms: boolean;
  returnUrl: string;
  onSuccess: (paymentIntentId: string) => void;
}

function StripeForm({
  agreedToTerms,
  returnUrl,
  onSuccess,
}: {
  agreedToTerms: boolean;
  returnUrl: string;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || isProcessing) return;

    setError('');
    setNotice('');
    setIsProcessing(true);

    const result = await stripe.confirmPayment({
      elements,
      // Required: automatic_payment_methods enables redirect-based methods
      // (Klarna, Affirm, iDEAL), and confirmPayment throws for those without a
      // return_url even when redirect is 'if_required'.
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (result.error) {
      // Replaces alert(), which was the only error surface.
      setError(result.error.message || 'Payment could not be completed. Please try again.');
      setIsProcessing(false);
      return;
    }

    const intent = result.paymentIntent;
    switch (intent?.status) {
      case 'succeeded':
        onSuccess(intent.id);
        return;
      case 'processing':
        // Previously fell through both branches, so the button silently
        // re-enabled while money was in flight.
        setNotice('Your payment is processing. We will email a receipt once it completes.');
        break;
      case 'requires_action':
        setNotice('Additional authentication is required. Follow the prompts from your bank.');
        break;
      default:
        setError('Payment was not completed. Please check your details and try again.');
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <PaymentElement />

      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="checkout-notice" role="status">
          {notice}
        </p>
      )}

      <button
        type="submit"
        className="add-to-cart payment-submit"
        disabled={isProcessing || !stripe || !elements || !agreedToTerms}
      >
        <span>{isProcessing ? 'PROCESSING…' : 'PAY SECURELY WITH STRIPE'}</span>
        {!isProcessing && (
          <span className="material-symbols-outlined" aria-hidden="true">
            lock
          </span>
        )}
      </button>
      {!agreedToTerms && (
        <p className="checkout-hint">Accept the refund and cancellation policy to continue.</p>
      )}
    </form>
  );
}

export default function PaymentSection({ clientSecret, agreedToTerms, returnUrl, onSuccess }: Props) {
  const stripePromise = useMemo(() => getStripe(), []);

  return (
    <section className="payment-section">
      <h2 className="headline-md">Payment</h2>
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat' } }}>
        <StripeForm agreedToTerms={agreedToTerms} returnUrl={returnUrl} onSuccess={onSuccess} />
      </Elements>
    </section>
  );
}
