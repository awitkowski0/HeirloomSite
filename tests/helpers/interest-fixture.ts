import type { InterestCatalogItem } from '../../src/lib/interest/catalog';
import type { InterestEvent, InterestKind } from '../../src/lib/interest/events';

export const NOW = Date.UTC(2026, 10, 8, 18, 0, 0);
export const DAY = 24 * 60 * 60 * 1000;

function item(
  slug: string,
  pieceType: string,
  style: string | null,
  styleLabel: string | null,
  price: number,
  builderId: string,
  builderName: string,
  finishes: string[],
): InterestCatalogItem {
  return {
    slug,
    name: slug,
    category: pieceType,
    pieceType,
    price,
    builderId,
    builderName,
    style,
    styleLabel,
    finishes,
    listed: pieceType !== 'conversion',
  };
}

const FIN = ['Natural', 'Harvest', 'Provincial', 'Ebony', 'Antique Slate'];

export const CATALOG: InterestCatalogItem[] = [
  item('arched-a', 'crib', 'arched-slats', 'Arched Slats', 1800, 'oto', 'Old Town Oak', FIN),
  item('arched-b', 'crib', 'arched-slats', 'Arched Slats', 2000, 'oto', 'Old Town Oak', FIN),
  item('classic-a', 'crib', 'classic-slats', 'Classic Slats', 1200, 'fishers', "Fisher's Quality", FIN),
  item('classic-b', 'crib', 'classic-slats', 'Classic Slats', 1400, 'fishers', "Fisher's Quality", FIN),
  item('panel-a', 'crib', 'arched-panel', 'Arched Panel', 2400, 'oto', 'Old Town Oak', FIN),
  item('crib-mini', 'crib', 'classic-slats', 'Classic Slats', 900, 'fishers', "Fisher's Quality", ['Natural']),
  item('dresser-a', 'dresser', null, null, 1900, 'oto', 'Old Town Oak', FIN),
  item('dresser-b', 'dresser', null, null, 2400, 'oto', 'Old Town Oak', FIN),
  item('nightstand-a', 'nightstand', null, null, 700, 'oto', 'Old Town Oak', FIN),
  item('rail-kit', 'conversion', null, null, 300, 'oto', 'Old Town Oak', ['Natural']),
  item('dresser-c', 'dresser', null, null, 2000, 'oto', 'Old Town Oak', FIN),
];

let counter = 0;

export function event(
  kind: InterestKind,
  slug: string,
  daysAgo: number,
  extra: Partial<InterestEvent> = {},
): InterestEvent {
  counter += 1;
  return { id: `evt-${String(counter).padStart(8, '0')}`, kind, slug, at: NOW - daysAgo * DAY, ...extra };
}
