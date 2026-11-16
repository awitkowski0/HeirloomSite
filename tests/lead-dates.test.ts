import test from 'node:test';
import assert from 'node:assert/strict';
import { DAYS_FROM_BUILT_TO_ARRIVAL, leadDates, shortDate } from '@/lib/lead-dates';

const DAY = 86_400_000;

test('built by is today plus the builder lead, and arrival adds the stated buffer', () => {
  const today = new Date(2026, 10, 9).getTime();
  const fishers = leadDates(today, 14);
  assert.equal(fishers.orderDay, today);
  assert.equal(fishers.builtBy, today + 14 * 7 * DAY);
  assert.equal(fishers.arrival, fishers.builtBy + DAYS_FROM_BUILT_TO_ARRIVAL * DAY);
  assert.equal(shortDate(today), 'Nov 09');
});
