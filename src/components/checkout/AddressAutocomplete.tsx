'use client';

import { useId, useState } from 'react';
import { useAddressSearch, type AddressSuggestion } from './useAddressSearch';

/**
 * The street-address field, with a type-ahead over it.
 *
 * A real combobox rather than a div that looks like one: role="combobox" with
 * aria-expanded and aria-activedescendant, arrow keys to move, Enter to take,
 * Escape to dismiss. Freight delivery to a mistyped address is an expensive
 * mistake, and a picker only helps if it can be driven without a mouse.
 *
 * Degrades to a plain input when NEXT_PUBLIC_RADAR_KEY is unset or the lookup
 * fails - the customer can always just type, and nothing about placing an order
 * depends on this.
 */

interface Props {
  id: string;
  value: string;
  error?: string;
  errorId: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  /** Fills street, city, state and ZIP together, in a single write. */
  onSelect: (parts: Omit<AddressSuggestion, 'label'>) => void;
}

export default function AddressAutocomplete({
  id,
  value,
  error,
  errorId,
  disabled,
  onChange,
  onSelect,
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  /*
   * The street line we last filled in from a pick.
   *
   * State rather than a ref, because it is READ during render to decide
   * whether to search - and a ref read at render time is the hazard the
   * react-hooks/refs rule exists to catch. While the field still holds exactly
   * what the pick wrote, there is nothing to look up; the moment the customer
   * edits it, the two differ and the search resumes on its own.
   */
  const [pickedAddress, setPickedAddress] = useState<string | null>(null);

  const { suggestions, loading } = useAddressSearch(value === pickedAddress ? '' : value);
  const showList = open && suggestions.length > 0;

  const take = (s: AddressSuggestion) => {
    setPickedAddress(s.address);
    onSelect({ address: s.address, city: s.city, state: s.state, zip: s.zip });
    setOpen(false);
    setHighlighted(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      // Only when something is highlighted, so Enter still submits the form
      // for someone who typed the address out and never opened the list.
      e.preventDefault();
      take(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  return (
    <div className="address-combobox">
      <input
        id={id}
        name="address"
        type="text"
        // Browser autofill is still wanted; this only adds a second route in.
        autoComplete="street-address"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlighted >= 0 ? `${listId}-option-${highlighted}` : undefined
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        disabled={disabled}
        required
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
          setHighlighted(-1);
        }}
        onKeyDown={onKeyDown}
        // A blur that lands ON an option must not close the list before the
        // click registers, so this waits a tick.
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onFocus={() => setOpen(true)}
      />

      {loading && showList === false && value.trim().length >= 4 && (
        <span className="address-combobox-status label-caps text-on-surface-variant">
          Searching…
        </span>
      )}

      <ul
        id={listId}
        role="listbox"
        aria-label="Address suggestions"
        className="address-suggestions"
        hidden={!showList}
      >
        {suggestions.map((s, i) => (
          <li
            key={`${s.address}-${s.zip}-${i}`}
            id={`${listId}-option-${i}`}
            role="option"
            aria-selected={highlighted === i}
            // ph-mask: these are the visitor's real street address, as text,
            // which session recording would otherwise capture in the clear.
            className={`address-suggestion ph-mask${highlighted === i ? ' is-highlighted' : ''}`}
            // onMouseDown, not onClick: mousedown fires before the input's blur,
            // so the pick lands even though blur is closing the list.
            onMouseDown={e => {
              e.preventDefault();
              take(s);
            }}
            onMouseEnter={() => setHighlighted(i)}
          >
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
