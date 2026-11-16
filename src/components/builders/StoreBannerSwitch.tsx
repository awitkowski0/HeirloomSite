'use client';

import { useSelectedLayoutSegment } from 'next/navigation';

/*
 * The store home shows the whole banner; a section shows the one-line name. One
 * of the two is mounted, never both hidden in CSS, so a section page loads no
 * banner photo. The segment comes from the route, not the query string, so this
 * leaves every store page statically prerendered.
 */
export default function StoreBannerSwitch({ full, collapsed }: { full: React.ReactNode; collapsed: React.ReactNode }) {
  return <>{useSelectedLayoutSegment() === null ? full : collapsed}</>;
}
