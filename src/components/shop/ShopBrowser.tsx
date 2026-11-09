'use client';

import { useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SetAsideButton from '@/components/selections/SetAsideButton';
import { TONES, type Tone } from '@/lib/finish-tones';
import { formatPriceApprox } from '@/lib/format';
import type { ShopItem } from '@/lib/shop';
import { useDelistedProducts } from '@/lib/useDelistedProducts';
import '@/styles/shop.css';

/*
 * The plain index behind the edited plates. One control: which tone of wood to
 * look at. It lives in sessionStorage so Back returns to the same cards, and the
 * scroll offset still points at what the shopper was looking at.
 */
const KEY = 'heirloom_catalog_tone';
const EVENT = 'heirloom_catalog_tone_change';

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
function read(): Tone | '' {
  try {
    return (sessionStorage.getItem(KEY) as Tone | null) ?? '';
  } catch {
    return '';
  }
}
function write(value: Tone | '') {
  try {
    sessionStorage.setItem(KEY, value);
  } catch {
    // Private windows can refuse storage; the page still works for this view.
  }
  window.dispatchEvent(new Event(EVENT));
}

export default function ShopBrowser({ items, priorityCount = 0 }: { items: ShopItem[]; priorityCount?: number }) {
  const { isDelisted } = useDelistedProducts();
  const tone = useSyncExternalStore(subscribe, read, () => '' as const);
  const hasTones = items.some(i => i.finishImages.length > 1);
  const shown = items
    .filter(i => !isDelisted(i.slug))
    .flatMap(item => {
      if (!tone) return [{ item, image: item.image }];
      const match = item.finishImages.find(f => f.tone === tone);
      return match ? [{ item, image: match.image }] : [];
    });

  return (
    <div className="shop">
      {hasTones && (
        <div className="shop-tones" role="group" aria-label="Show finishes by tone">
          <span className="label-caps">Finish</span>
          <button type="button" aria-pressed={!tone} onClick={() => write('')}>All</button>
          {TONES.map(t => (
            <button key={t.id} type="button" aria-pressed={tone === t.id} onClick={() => write(t.id)}>{t.label}</button>
          ))}
          <span className="shop-count" aria-live="polite">{shown.length} {shown.length === 1 ? 'piece' : 'pieces'}</span>
        </div>
      )}
      {tone && <p className="plate-fine">Digital preview of each finish.</p>}
      <ul className="shop-grid">
        {shown.map(({ item, image }, i) => (
          <li key={item.slug} className="shop-card">
            <Link
              href={`/product/${item.slug}`}
              className="shop-card__link"
              data-product-name={item.name}
              data-product-category={item.category ?? undefined}
            >
              <span className="shop-card__img">
                {image ? (
                  <Image
                    src={image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 400px"
                    priority={i < priorityCount}
                    style={{ objectFit: 'contain', objectPosition: 'bottom' }}
                  />
                ) : null}
              </span>
              <span className="shop-card__name">{item.name}</span>
              {item.builder && <span className="builder-tag">{item.builder} · {item.state}</span>}
              <span className="shop-card__price">From {formatPriceApprox(item.price)}</span>
            </Link>
            <SetAsideButton item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
