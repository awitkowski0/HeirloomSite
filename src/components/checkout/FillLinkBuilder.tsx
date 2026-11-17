'use client';

import { useMemo, useState } from 'react';
import { encodeFill, cleanFill, FILL_FIELDS, type FillField } from '@/lib/checkout-fill';
import { SHIPPABLE_STATE_CODES, SHIPPING_METHODS, type PaymentOption, type ShippingMethodId } from '@/lib/order-terms';

const LABELS: Record<FillField, string> = {
  email: 'Email',
  phone: 'Phone',
  firstName: 'First name',
  lastName: 'Last name',
  address: 'Street address',
  city: 'City',
  state: 'State',
  zip: 'ZIP',
};

const PAYMENTS: readonly { value: PaymentOption; label: string }[] = [
  { value: 'deposit', label: '50% deposit now' },
  { value: 'full', label: 'Pay in full' },
  { value: 'affirm', label: 'Pay over time with Affirm' },
];

/** The staff form on /staff/checkout-link. Builds the link in the browser; sends nothing anywhere. */
export default function FillLinkBuilder() {
  const [fields, setFields] = useState<Record<FillField, string>>(
    () => Object.fromEntries(FILL_FIELDS.map(f => [f, ''])) as Record<FillField, string>,
  );
  const [method, setMethod] = useState<ShippingMethodId | ''>('');
  const [payment, setPayment] = useState<PaymentOption | ''>('');
  const [copied, setCopied] = useState(false);

  // Run through the same validator the checkout uses, so what is shown here is
  // exactly what the customer's page will accept.
  const payload = useMemo(
    () => cleanFill({ v: 1, s: fields, m: method || undefined, p: payment || undefined }),
    [fields, method, payment],
  );
  const link =
    payload && typeof window !== 'undefined' ? `${window.location.origin}/checkout#${encodeFill(payload)}` : '';
  const dropped = FILL_FIELDS.filter(f => fields[f].trim() !== '' && !payload?.shipping[f]);

  return (
    <form className="fill-builder" onSubmit={e => e.preventDefault()}>
      <div className="fill-grid">
        {FILL_FIELDS.map(f => (
          <label key={f} className="fill-field">
            <span className="label-caps">{LABELS[f]}</span>
            {f === 'state' ? (
              <select value={fields.state} onChange={e => setFields({ ...fields, state: e.target.value })}>
                <option value="">—</option>
                {SHIPPABLE_STATE_CODES.map(code => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text'}
                value={fields[f]}
                maxLength={100}
                onChange={e => {
                  setCopied(false);
                  setFields({ ...fields, [f]: e.target.value });
                }}
              />
            )}
          </label>
        ))}
      </div>

      <fieldset className="fill-choices">
        <legend className="label-caps">Delivery</legend>
        {SHIPPING_METHODS.map(m => (
          <label key={m.id}>
            <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} /> {m.name}
          </label>
        ))}
        <label>
          <input type="radio" name="method" checked={method === ''} onChange={() => setMethod('')} /> Let them choose
        </label>
      </fieldset>

      <fieldset className="fill-choices">
        <legend className="label-caps">Payment</legend>
        {PAYMENTS.map(p => (
          <label key={p.value}>
            <input type="radio" name="payment" checked={payment === p.value} onChange={() => setPayment(p.value)} />{' '}
            {p.label}
          </label>
        ))}
        <label>
          <input type="radio" name="payment" checked={payment === ''} onChange={() => setPayment('')} /> Let them choose
        </label>
      </fieldset>

      {dropped.length > 0 && (
        <p className="registry-note" role="status">
          Not included (empty, too long or not a valid value): {dropped.map(f => LABELS[f]).join(', ')}.
        </p>
      )}

      {link ? (
        <div className="fill-output">
          <input type="text" readOnly value={link} aria-label="Fill link" onFocus={e => e.currentTarget.select()} />
          <button
            type="button"
            className="button-primary"
            onClick={() =>
              void navigator.clipboard?.writeText(link).then(
                () => setCopied(true),
                () => setCopied(false),
              )
            }
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      ) : (
        <p className="body-md text-on-surface-variant">Fill in at least one detail to make a link.</p>
      )}
    </form>
  );
}
