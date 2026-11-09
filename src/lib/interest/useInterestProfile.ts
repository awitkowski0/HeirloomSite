import { useMemo, useSyncExternalStore } from 'react';
import type { InterestCatalogItem } from './catalog';
import { synthesizeProfile, type InterestProfile } from './profile';
import {
  getInterestServerState,
  getInterestState,
  subscribeInterest,
  type InterestStatus,
} from './store';

export interface InterestProfileView {
  status: InterestStatus;
  /** Null unless the visitor is `learning`. Nothing is personalized otherwise. */
  profile: InterestProfile | null;
}

/**
 * The visitor's profile, for a client component.
 *
 * The server and the first client render always see `waiting` with no profile,
 * so prerendered HTML carries nothing personal and hydration cannot mismatch.
 */
export function useInterestProfile(catalog: readonly InterestCatalogItem[]): InterestProfileView {
  const state = useSyncExternalStore(subscribeInterest, getInterestState, getInterestServerState);
  return useMemo(
    () => ({
      status: state.status,
      profile: state.status === 'learning' ? synthesizeProfile(state.events, catalog, { now: state.readAt }) : null,
    }),
    [state, catalog],
  );
}
