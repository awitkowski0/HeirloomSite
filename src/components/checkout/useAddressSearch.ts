'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Address type-ahead, against Radar.
 *
 * Called straight from the browser with a PUBLISHABLE key, which is what Radar
 * publishes them for - the alternative is proxying every keystroke through our
 * own route, which buys nothing here (the key is meant to be public) and puts a
 * serverless round trip in front of a dropdown that has to feel instant.
 *
 * Restrict the key to your domains in the Radar dashboard. It is public by
 * design, so the domain allowlist is what stops someone else spending the
 * free tier.
 *
 * Inert without NEXT_PUBLIC_RADAR_KEY: the form is a plain form, exactly as it
 * was, and nothing about checkout depends on this working.
 */

const ENDPOINT = 'https://api.radar.io/v1/search/autocomplete';

/* Long enough that a whole street name is not four requests, short enough that
   the list feels like it is keeping up. */
const DEBOUNCE_MS = 250;

/** Below this a query matches half the country and the results are noise. */
const MIN_QUERY = 4;

export interface AddressSuggestion {
  /** What the customer sees in the dropdown. */
  label: string;
  /** Street line only - "421 Manor Drive". */
  address: string;
  city: string;
  /** Two-letter code, matching the values in the state select. */
  state: string;
  zip: string;
}

interface RadarAddress {
  formattedAddress?: string;
  addressLabel?: string;
  number?: string;
  street?: string;
  city?: string;
  stateCode?: string;
  postalCode?: string;
}

function toSuggestion(a: RadarAddress): AddressSuggestion | null {
  const street = a.addressLabel || [a.number, a.street].filter(Boolean).join(' ');
  // A result with no street line cannot fill the form, so it must not offer to.
  if (!street || !a.city || !a.stateCode) return null;
  return {
    label: a.formattedAddress || `${street}, ${a.city}, ${a.stateCode} ${a.postalCode ?? ''}`.trim(),
    address: street,
    city: a.city,
    state: a.stateCode,
    zip: a.postalCode ?? '',
  };
}

export function addressSearchEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_RADAR_KEY);
}

export function useAddressSearch(query: string): {
  suggestions: AddressSuggestion[];
  loading: boolean;
} {
  /*
   * One piece of state, holding the query its results belong to.
   *
   * Everything else is DERIVED. Storing `suggestions` and `loading` separately
   * meant clearing them synchronously whenever the query went short or empty,
   * which is a setState during an effect - a render-cascade the lint rule here
   * rejects on sight. Keying the result by its own query makes "we do not have
   * results for what is typed right now" a comparison instead of a write.
   */
  const [result, setResult] = useState<{ query: string; items: AddressSuggestion[] } | null>(
    null
  );
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const active = Boolean(process.env.NEXT_PUBLIC_RADAR_KEY) && trimmed.length >= MIN_QUERY;

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_RADAR_KEY;
    if (!key || trimmed.length < MIN_QUERY) return;

    const timer = setTimeout(() => {
      // Supersede the previous request rather than racing it: without this a
      // slow early response can land after a fast later one and repopulate the
      // list with results for a query the customer has already typed past.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const url =
        `${ENDPOINT}?query=${encodeURIComponent(trimmed)}` +
        '&country=US&layers=address&limit=5';

      fetch(url, { headers: { Authorization: key }, signal: controller.signal })
        .then(res => (res.ok ? res.json() : Promise.reject(new Error(`Radar ${res.status}`))))
        .then((data: { addresses?: RadarAddress[] }) => {
          const items = (data.addresses ?? [])
            .map(toSuggestion)
            .filter((x): x is AddressSuggestion => x !== null);
          setResult({ query: trimmed, items });
        })
        .catch((err: Error) => {
          if (err.name === 'AbortError') return;
          // Silent to the customer, deliberately: the form still works by hand,
          // and an error under the address field on a lookup they did not ask
          // for reads as something they have done wrong.
          console.error('Address lookup failed:', err.message);
          setResult({ query: trimmed, items: [] });
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const matches = active && result?.query === trimmed;
  return {
    suggestions: matches ? result.items : [],
    // Active but nothing for THIS query yet - covers the debounce window too,
    // which is where the wait actually is.
    loading: active && !matches,
  };
}
