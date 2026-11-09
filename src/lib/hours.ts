/*
 * PLACEHOLDER. The family has not confirmed real hours or who answers yet, so
 * this says Monday to Friday, 9 to 5 Eastern until they do.
 */
export const HOURS_LABEL = 'Monday to Friday, 9am to 5pm ET';
export const PHONE_DISPLAY = '(484) 293-1840';
export const PHONE_HREF = 'tel:+14842931840';

export interface OpenState {
  open: boolean;
  /** When someone will next be reading messages. Null while open. */
  next: string | null;
}

export function openState(now: Date): OpenState {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find(p => p.type === 'weekday')?.value ?? '');
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const weekday = day >= 1 && day <= 5;
  if (weekday && hour >= 9 && hour < 17) return { open: true, next: null };
  if (weekday && hour < 9) return { open: false, next: 'today at 9am ET' };
  if (day >= 1 && day <= 4) return { open: false, next: 'tomorrow at 9am ET' };
  return { open: false, next: 'Monday at 9am ET' };
}
