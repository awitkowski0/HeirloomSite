/*
 * Moving the profile to an account, only when the visitor taps to.
 *
 * All three calls go to our own /api/interest and nowhere else. They are the
 * only network calls in this directory and each one is a visitor's deliberate
 * action. Accounts are local-only for now, so the route answers 503 on Vercel
 * and these report `available: false`.
 */
import type { InterestEvent } from './events';
import type { InterestStore } from './store';

const ENDPOINT = '/api/interest';

export interface InterestAccountStatus {
  available: boolean;
  signedIn: boolean;
  /** Events already on the account. */
  accountEvents: number;
}

const UNAVAILABLE: InterestAccountStatus = { available: false, signedIn: false, accountEvents: 0 };

type Fetcher = typeof fetch;

export interface InterestAccount {
  check: () => Promise<InterestAccountStatus>;
  /** Sends this device's events to the account and takes the merged log back. */
  merge: () => Promise<boolean>;
  /** Clears this device and, if signed in, the account copy. */
  forgetEverywhere: (signedIn: boolean) => Promise<boolean>;
}

export function createInterestAccount(store: InterestStore, fetcher: Fetcher): InterestAccount {
  async function check(): Promise<InterestAccountStatus> {
    try {
      const res = await fetcher(ENDPOINT, { headers: { accept: 'application/json' } });
      if (!res.ok) return UNAVAILABLE;
      const data = (await res.json()) as Partial<InterestAccountStatus>;
      return {
        available: true,
        signedIn: data.signedIn === true,
        accountEvents: typeof data.accountEvents === 'number' ? data.accountEvents : 0,
      };
    } catch {
      return UNAVAILABLE;
    }
  }

  async function merge(): Promise<boolean> {
    const state = store.getState();
    // The offer is only made while learning, but this is the point of no return.
    if (state.status !== 'learning') return false;
    try {
      const res = await fetcher(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ events: state.events }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { events?: InterestEvent[] };
      if (Array.isArray(data.events)) store.adopt(data.events);
      return true;
    } catch {
      return false;
    }
  }

  async function forgetEverywhere(signedIn: boolean): Promise<boolean> {
    store.clear();
    if (!signedIn) return true;
    try {
      const res = await fetcher(ENDPOINT, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  }

  return { check, merge, forgetEverywhere };
}
