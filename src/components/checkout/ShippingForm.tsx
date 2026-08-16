'use client';

import AddressAutocomplete from './AddressAutocomplete';
import {
  SHIPPABLE_STATES,
  UNSHIPPABLE_STATES,
  isShippableState,
  stateName,
} from '@/lib/order-terms';

export interface ShippingValues {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export const EMPTY_SHIPPING: ShippingValues = {
  email: '',
  phone: '',
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
  /* Two fields are not plain text inputs. Declared here rather than
     special-cased in the JSX so the field list stays the one description of
     this form. */
  control?: 'select' | 'address';
}> = [
  { key: 'email', label: 'Email address', type: 'email', autoComplete: 'email' },
  /* Required, because every order gets a confirmation call before it goes into
     production. A made-to-order piece has a stain and a kit list to get right,
     and email alone leaves an order stuck the moment a question needs asking. */
  { key: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel' },
  { key: 'firstName', label: 'First name', type: 'text', autoComplete: 'given-name' },
  { key: 'lastName', label: 'Last name', type: 'text', autoComplete: 'family-name' },
  {
    key: 'address',
    label: 'Street address',
    type: 'text',
    autoComplete: 'street-address',
    span: true,
    control: 'address',
  },
  { key: 'city', label: 'City', type: 'text', autoComplete: 'address-level2' },
  { key: 'state', label: 'State', type: 'text', autoComplete: 'address-level1', control: 'select' },
  { key: 'zip', label: 'ZIP code', type: 'text', autoComplete: 'postal-code' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/*
 * Deliberately loose: count the digits, do not police the formatting.
 *
 * People type (610) 555-0134, 610.555.0134 and +1 610 555 0134, and all three
 * are the same reachable number. Ten digits, or eleven starting with a 1.
 */
export function isUsPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

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
  if (values.phone.trim() && !isUsPhone(values.phone)) {
    errors.phone = 'Enter a 10-digit US phone number';
  }
  // Mirrors the server check in src/lib/pricing.ts. The select only offers
  // states the shop delivers to, so this only fires if the field is somehow
  // cleared - but the state decides both the delivery route and whether sales
  // tax is charged, so it is worth saying out loud rather than letting the
  // server be the first to notice.
  if (values.state.trim() && !isShippableState(values.state.trim().toUpperCase())) {
    errors.state =
      `We don't deliver to ${stateName(values.state.trim())} yet — ` +
      'contact us and we will see what we can arrange.';
  }
  return errors;
}

interface Props {
  values: ShippingValues;
  errors: Partial<Record<keyof ShippingValues, string>>;
  disabled?: boolean;
  onChange: (field: keyof ShippingValues, value: string) => void;
  /*
   * Fills street, city, state and ZIP together when an address is picked from
   * the lookup. One write rather than four onChange calls, so the form state
   * and its localStorage copy move once instead of four times - and so a
   * half-applied address can never exist.
   */
  onSelectAddress: (parts: Pick<ShippingValues, 'address' | 'city' | 'state' | 'zip'>) => void;
}

export default function ShippingForm({
  values,
  errors,
  disabled,
  onChange,
  onSelectAddress,
}: Props) {
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
              {field.control === 'address' ? (
                <AddressAutocomplete
                  id={field.key}
                  value={values[field.key]}
                  error={error}
                  errorId={errorId}
                  disabled={disabled}
                  onChange={v => onChange(field.key, v)}
                  onSelect={onSelectAddress}
                />
              ) : field.control === 'select' ? (
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
                  {/*
                    Every state, in two groups, rather than only the seven we
                    deliver to. A missing option is a puzzle - someone in Texas
                    scrolls the list twice and leaves without knowing whether we
                    are broken or simply do not go there. Offering it and then
                    saying so answers the question.
                  */}
                  <optgroup label="We deliver here">
                    {SHIPPABLE_STATES.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Not yet — ask us">
                    {UNSHIPPABLE_STATES.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
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
