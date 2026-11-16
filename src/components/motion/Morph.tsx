import type { ReactNode } from 'react';

/*
 * Renders its child in place without a cross-page shared-element morph: grid cards
 * crossfade to room scenes on hover or mirror cribs inward, and stretching a hovered
 * room scene across the viewport into a cutout product photo looks broken.
 */
export default function Morph({ children }: { name: string; children: ReactNode }) {
  return <>{children}</>;
}
