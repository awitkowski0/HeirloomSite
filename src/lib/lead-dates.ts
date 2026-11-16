/*
 * The three dates on a product page's timing strip.
 *
 * ASSUMPTION THE OWNER SHOULD CONFIRM: 14 days from the piece being built to it
 * arriving. It is an estimate of finishing, staging and scheduling delivery, not
 * a promise, and the strip always says "Estimated" next to it.
 */
export const DAYS_FROM_BUILT_TO_ARRIVAL = 14;

const DAY_MS = 86_400_000;

export interface LeadDates {
  orderDay: number;
  builtBy: number;
  arrival: number;
}

/** From a day number (midnight, local) and the builder's longest lead time in weeks. */
export function leadDates(today: number, leadWeeksMax: number): LeadDates {
  const builtBy = today + leadWeeksMax * 7 * DAY_MS;
  return { orderDay: today, builtBy, arrival: builtBy + DAYS_FROM_BUILT_TO_ARRIVAL * DAY_MS };
}

/** "Nov 09": the same on any machine with this locale. */
export function shortDate(when: number): string {
  return new Date(when).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

/** Local midnight of today, as a stable number for a day-long snapshot. */
export function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
