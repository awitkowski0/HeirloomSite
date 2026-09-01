'use client';

/**
 * Consent for analytics and advertising, owned by one module.
 *
 * Geo-gated opt-in: visitors in the EU/EEA, the UK, Switzerland, Canada and
 * California are asked before anything loads; everyone else is tracked by
 * default and can turn it off. The jurisdiction list itself lives server-side
 * in src/app/api/geo/route.ts - this module only ever sees a boolean, which
 * keeps the list out of the client bundle and out of a diff every time it
 * changes.
 *
 * THIS MODULE MUST NOT IMPORT posthog-client. The dependency runs the other
 * way: posthog-client asks this module whether it may initialise. Importing
 * back would be a cycle, and the failure mode of a cycle here is an undefined
 * `consentStatus` at module-evaluation time, i.e. tracking that silently
 * ignores the banner.
 *
 * Exposed through useSyncExternalStore, like the cart (src/context/cartStore.ts)
 * and the shipping form, because localStorage genuinely is an external store
 * and reading it with setState-in-an-effect is both a hydration hazard and a
 * lint error here.
 */

/**
 * `unknown` is transient and is NOT the same as `denied`.
 *
 * It means "we have not finished asking Vercel where this request came from".
 * Anything that treats it as a refusal drops events for every visitor on earth
 * for the first few hundred milliseconds of every page load, because the geo
 * fetch is always slower than component mount - see the queue in
 * src/lib/posthog-client.ts, which exists precisely for this window.
 */
export type ConsentStatus = 'unknown' | 'pending' | 'granted' | 'denied';

const CONSENT_KEY = 'hc_consent';
const GEO_KEY = 'hc_geo';

/*
 * Bumping this re-prompts everyone.
 *
 * A consent record is a claim about what someone agreed to, so it is only valid
 * for the disclosure they were shown. Adding a third-party script that is not
 * in the /privacy list they read means the old answer no longer covers it.
 */
const CONSENT_VERSION = 1;

interface StoredConsent {
  v: number;
  status: 'granted' | 'denied';
  decidedAt: number;
  country: string | null;
}

interface GeoResult {
  country: string | null;
  region: string | null;
  consentRequired: boolean;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let status: ConsentStatus = 'unknown';
let country: string | null = null;
/** True when this visitor was actually shown the banner, for consent_decision. */
let prompted = false;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function setStatus(next: ConsentStatus): void {
  if (status === next) return;
  status = next;
  emit();
}

export function consentStatus(): ConsentStatus {
  return status;
}

export function consentCountry(): string | null {
  return country;
}

export function consentWasPrompted(): boolean {
  return prompted;
}

/** True once the visitor's answer is known either way - the popup waits on this. */
export function consentResolved(): boolean {
  return status === 'granted' || status === 'denied';
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function readStored(): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    // Same reasoning as the cart's validator: this is user-writable storage
    // that survives deploys, so a stale shape has to be rejected rather than
    // trusted. A bad record re-prompts, which is the safe direction.
    if (parsed?.v !== CONSENT_VERSION) return null;
    if (parsed.status !== 'granted' && parsed.status !== 'denied') return null;
    return parsed as StoredConsent;
  } catch {
    // Private browsing, a full quota, or corrupt JSON. Falling through to the
    // geo check re-asks, which is correct: an unreadable record is not consent.
    return null;
  }
}

function persist(next: 'granted' | 'denied'): void {
  try {
    const payload: StoredConsent = {
      v: CONSENT_VERSION,
      status: next,
      decidedAt: Date.now(),
      country,
    };
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
  } catch {
    /*
     * The decision still applies to this page view - `status` is in memory and
     * everything reads it from there. It just will not survive a reload, and
     * the visitor will be asked again. Annoying; not a compliance failure.
     */
  }
}

// ---------------------------------------------------------------------------
// Geo
// ---------------------------------------------------------------------------

/*
 * Cached in sessionStorage rather than localStorage on purpose: a new session
 * re-checks, so someone who travels or turns off a VPN is classified correctly
 * on their next visit, while a single visit still costs exactly one fetch.
 */
function readCachedGeo(): GeoResult | null {
  try {
    const raw = window.sessionStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GeoResult>;
    if (typeof parsed?.consentRequired !== 'boolean') return null;
    return {
      country: typeof parsed.country === 'string' ? parsed.country : null,
      region: typeof parsed.region === 'string' ? parsed.region : null,
      consentRequired: parsed.consentRequired,
    };
  } catch {
    return null;
  }
}

async function fetchGeo(): Promise<GeoResult> {
  const cached = readCachedGeo();
  if (cached) return cached;

  /*
   * Any failure means consent is required.
   *
   * Fail CLOSED, and note this is the opposite of how the feature flags in
   * useDelistedProducts fail. A blocked request or an offline visitor must not
   * silently become "tracking is fine" - the whole banner would be decorative
   * for exactly the population most likely to be running a blocker.
   */
  const failClosed: GeoResult = { country: null, region: null, consentRequired: true };

  /*
   * Forward ?country= / ?region= from the page URL, in development only.
   *
   * /api/geo honours those parameters (dev only, there too), but the client is
   * what calls it - so without this the override is reachable by curl and by
   * nothing else, and the one test that actually matters, "load the real site
   * as a German visitor and watch the network tab", cannot be run at all.
   *
   * NODE_ENV is inlined at build time, so this compiles away entirely in a
   * production bundle. Nobody can talk themselves out of a consent prompt with
   * a query string.
   */
  let path = '/api/geo';
  if (process.env.NODE_ENV !== 'production') {
    const override = new URLSearchParams();
    const current = new URLSearchParams(window.location.search);
    for (const key of ['country', 'region']) {
      const value = current.get(key);
      if (value) override.set(key, value);
    }
    if (override.size > 0) path += `?${override}`;
  }

  try {
    const res = await fetch(path, { headers: { accept: 'application/json' } });
    if (!res.ok) return failClosed;
    const data = (await res.json()) as Partial<GeoResult>;
    if (typeof data?.consentRequired !== 'boolean') return failClosed;
    const result: GeoResult = {
      country: typeof data.country === 'string' ? data.country : null,
      region: typeof data.region === 'string' ? data.region : null,
      consentRequired: data.consentRequired,
    };
    try {
      window.sessionStorage.setItem(GEO_KEY, JSON.stringify(result));
    } catch {
      /* Not worth failing over; it just means one fetch per page view. */
    }
    return result;
  } catch {
    return failClosed;
  }
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

let resolving: Promise<void> | null = null;

/**
 * Work out where this visitor stands. Idempotent and safe to call from anywhere.
 *
 * Called once from Providers on mount. The promise is memoised because
 * React Strict Mode double-invokes effects in development, and two in-flight
 * geo fetches would race to set the status.
 */
export function resolveConsent(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (resolving) return resolving;

  resolving = (async () => {
    const stored = readStored();
    if (stored) {
      country = stored.country;
      setStatus(stored.status);
      return;
    }

    const geo = await fetchGeo();
    country = geo.country;
    if (!geo.consentRequired) {
      /*
       * Implied consent, no banner. Deliberately NOT persisted: if this visitor
       * later loads the site from a gated region, or the gate list grows to
       * include theirs, they must be asked rather than held to a decision they
       * never made.
       */
      setStatus('granted');
      return;
    }
    prompted = true;
    setStatus('pending');
  })();

  return resolving;
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export function grantConsent(): void {
  persist('granted');
  setStatus('granted');
}

export function denyConsent(): void {
  persist('denied');
  setStatus('denied');
}

/**
 * Reopen the banner from the footer's "Cookie settings".
 *
 * Clears the stored record so the banner shows again, and drops back to
 * `pending` rather than to `unknown` - the visitor is looking at the banner,
 * which is what pending means. Withdrawal proper (stopping the recorder,
 * clearing the ad cookies) is posthog-client's and meta-pixel's job, wired up
 * in the banner, because this module may not import either.
 */
export function reopenConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* The in-memory status below is what the UI reads. */
  }
  prompted = true;
  setStatus('pending');
}

// ---------------------------------------------------------------------------
// useSyncExternalStore adapter
// ---------------------------------------------------------------------------

export function subscribeConsent(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getConsentSnapshot(): ConsentStatus {
  return status;
}

/**
 * Always `unknown` on the server.
 *
 * The prerendered HTML cannot know what is in someone's browser or where they
 * are, so nothing consent-dependent may render in it - the banner and the
 * popup both return null for this value. Anything else is a hydration mismatch,
 * and the banner would additionally flash for every ungated visitor on earth.
 */
export function getConsentServerSnapshot(): ConsentStatus {
  return 'unknown';
}
