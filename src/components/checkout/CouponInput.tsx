'use client';

import { useRef, useState } from 'react';
import { validateCoupon, type CartItemPayload } from '@/lib/api-client';
import { formatPrice, fromCents } from '@/lib/format';
import TurnstileWidget, { type TurnstileHandle } from './TurnstileWidget';
import { TURNSTILE_ACTIONS } from '@/lib/turnstile-action';

export interface AppliedCoupon {
  code: string;
  amountOffCents: number;
}

interface Props {
  /** To recompute the discount preview against the CURRENT cart. */
  cart: CartItemPayload[];
  applied: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
  /** True while the main checkout form is submitting. */
  disabled: boolean;
}

/**
 * A coupon code field, separate from the shipping <form> it sits above:
 * applying a code must not require the shipping fields to validate first, and
 * needs to work before an address has been entered at all.
 *
 * Carries its own Turnstile widget (a low-friction 'interaction-only' badge,
 * same reasoning as the newsletter popup) because POST /api/coupon/validate
 * has its own action distinct from checkout's - see turnstile-action.ts.
 */
export default function CouponInput({ cart, applied, onApply, onRemove, disabled }: Props) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleApply = async () => {
    if (code.trim() === '') return;
    setPending(true);
    setError('');
    try {
      const data = await validateCoupon({ code, cart, turnstileToken });
      onApply({ code: data.code, amountOffCents: data.amountOffCents });
      setCode('');
    } catch (err) {
      setError((err as Error).message || 'Could not apply that code.');
      /*
       * The token is spent whatever went wrong, same reason the main checkout
       * form resets its own on failure: without this, retrying resends a dead
       * token and siteverify answers timeout-or-duplicate instead of the
       * actual problem.
       */
      turnstileRef.current?.reset();
    } finally {
      setPending(false);
    }
  };

  if (applied) {
    return (
      <div className="coupon-applied">
        <span className="material-symbols-outlined text-secondary" aria-hidden="true">
          local_offer
        </span>
        <span>
          <strong>{applied.code}</strong> applied — {formatPrice(fromCents(applied.amountOffCents))} off
        </span>
        <button type="button" className="button-secondary" onClick={onRemove} disabled={disabled}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="coupon-section">
      <div className="coupon-form">
        <input
          id="coupon-code"
          type="text"
          placeholder="Coupon code"
          aria-label="Coupon code"
          value={code}
          onChange={e => {
            setCode(e.target.value);
            if (error) setError('');
          }}
          disabled={disabled || pending}
        />
        <button
          type="button"
          className="button-secondary"
          onClick={handleApply}
          disabled={disabled || pending || code.trim() === ''}
        >
          {pending ? 'Checking…' : 'Apply'}
        </button>
      </div>
      <TurnstileWidget
        ref={turnstileRef}
        onToken={setTurnstileToken}
        onStatus={() => {}}
        action={TURNSTILE_ACTIONS.coupon}
        appearance="interaction-only"
      />
      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
