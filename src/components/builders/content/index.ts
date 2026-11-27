import type { Metadata } from 'next';
import type { ComponentType } from 'react';
import * as fishers from './fishers-quality-products';
import * as kidsComfort from './kids-comfort';
import * as oldTownOak from './old-town-oak';

/** Each builder's page copy, keyed by builder id (src/lib/builders.ts). */
export const BUILDER_CONTENT: Readonly<
  Record<string, { metadata: Metadata; Banner: ComponentType; Story: ComponentType }>
> = {
  'old-town-oak': oldTownOak,
  'fishers-quality-products': fishers,
  'kids-comfort': kidsComfort,
};
