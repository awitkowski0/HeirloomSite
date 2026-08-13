'use client';

import { US_STATES, isUsState } from '@/lib/order-terms';

export interface ShippingValues {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export const EMPTY_SHIPPING: ShippingValues = {
  email: '',
  firstName: '',
  lastName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
};

const FIELDS: Array<{
  key: keyof ShippingValues;
  label: string;
  type: string;
  autoComplete: string;
  span?: boolean;
  /* `state` is the only control that is not a text input. Declared here rather
     than special-cased in the JSX so the field list stays the one description
     of this form. */
  control?: 'select';
}> = [
  { key: 'email', label: 'Email address', type: 'email', autoComplete: 'email', span: true },
  { key: 'firstName', label: 'First name', type: 'text', autoComplete: 'given-name' },
  { key: 'lastName', label: 'Last name', type: 'text', autoComplete: 'family-name' },
  { key: 'address', label: 'Street address', type: 'text', autoComplete: 'street-address', span: true },
  { key: 'city', label: 'City', type: 'text', autoComplete: 'address-level2' },
  { key: 'state', label: 'State', type: 'text', autoComplete: 'address-level1', control: 'select' },
  { key: 'zip', label: 'ZIP code', type: 'text', autoComplete: 'postal-code' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateShipping(values: ShippingValues): Partial<Record<keyof ShippingValues, string>> {
  const errors: Partial<Record<keyof ShippingValues, string>> = {};
  for (const field of FIELDS) {
    if (!values[field.key].trim()) errors[field.key] = `${field.label} is required`;
  }
  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (values.zip.trim() && !/^[A-Za-z0-9][A-Za-z0-9\- ]{2,11}$/.test(values.zip.trim())) {
    errors.zip = 'Enter a valid ZIP code';
  }
  // Mirrors the server check in src/lib/pricing.ts. The select cannot produce
  // an invalid code, so this only fires if the field is somehow cleared - but
  // the state now decides whether sales tax is charged, so it is worth saying
  // out loud rather than letting the server be the first to notice.
  if (values.state.trim() && !isUsState(values.state.trim().toUpperCase())) {
    errors.state = 'Select a US state';
  }
  return errors;
}

interface Props {
  values: ShippingValues;
  errors: Partial<Record<keyof ShippingValues, string>>;
  disabled?: boolean;
  onChange: (field: keyof ShippingValues, value: string) => void;
}

export default function ShippingForm({ values, errors, disabled, onChange }: Props) {
  return (
    <fieldset className="checkout-fieldset" disabled={disabled}>
      <legend className="headline-md">Contact &amp; shipping</legend>
      <div className="checkout-grid">
        {FIELDS.map(field => {
          const error = errors[field.key];
          const errorId = `${field.key}-error`;
          return (
            <div key={field.key} className={`field${field.span ? ' field--span' : ''}`}>
              <label htmlFor={field.key} className="label-caps">
                {field.label}
              </label>
              {field.control === 'select' ? (
                <select
                  id={field.key}
                  name={field.key}
                  autoComplete={field.autoComplete}
                  value={values[field.key]}
                  onChange={e => onChange(field.key, e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  required
                >
                  <option value="">Select a state</option>
                  {US_STATES.map(s => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.key}
                  name={field.key}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  value={values[field.key]}
                  onChange={e => onChange(field.key, e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  required
                />
              )}
              {error && (
                <p id={errorId} className="field-error" role="alert">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
