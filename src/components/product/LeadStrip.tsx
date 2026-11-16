'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { leadDates, shortDate, startOfToday } from '@/lib/lead-dates';

const noSubscribe = () => () => {};
const serverToday = () => null;

const ICONS = [
  // Order: a list with a tick.
  <path key="order" d="M5 3h14v18H5zM8 8h8M8 12h5M9 16.5l1.8 1.8 3.7-3.7" />,
  // Built: a crib outline.
  <path key="built" d="M3 19V7c5.5-3 12.5-3 18 0v12M3 17h18M3 8h18M7 8v9M11 8v9M15 8v9M19 8v9" />,
  // Arrival: a house.
  <path key="arrive" d="M4 11l8-6 8 6M6 10v10h12V10M10 20v-6h4v6" />,
];

/*
 * Order today, built by, estimated arrival: three steps on a thin line. The dates
 * come from the browser's clock so they are never stale in prerendered HTML: the
 * server renders the labels and a reserved line, and the dates arrive on hydration
 * in the same box without moving anything. No promise is made; the arrival is
 * always called estimated.
 */
export default function LeadStrip({ leadWeeksMax }: { leadWeeksMax: number }) {
  const today = useSyncExternalStore(noSubscribe, startOfToday, serverToday);
  const root = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.in = '';
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dates = today === null ? null : leadDates(today, leadWeeksMax);
  const steps = [
    { label: 'Order today', date: dates && shortDate(dates.orderDay) },
    { label: 'Built by', date: dates && shortDate(dates.builtBy) },
    { label: 'Estimated arrival', date: dates && shortDate(dates.arrival) },
  ];

  return (
    <ol className="lead-strip" ref={root} aria-label="Estimated timing">
      {steps.map((step, i) => (
        <li key={step.label} style={{ ['--i' as string]: i }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[i]}</svg>
          <span className="lead-strip-label">{step.label}</span>
          <span className="lead-strip-date">{step.date ?? ' '}</span>
        </li>
      ))}
    </ol>
  );
}
