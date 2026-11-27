'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { RoomImage } from '@/lib/room-images';

export interface RoomRowItem extends RoomImage {
  /** Where the card goes; omitted on the piece's own page. */
  href?: string;
  /** Caption under the photo; empty on the piece's own page, where it would only repeat the alt text. */
  name: string;
}

/**
 * A sliding row of room photos. Swipe on a phone, arrows with a mouse; it
 * never advances by itself. Images are lazy next/image, so only the ones in
 * view load.
 */
export default function RoomRow({ items, label }: { items: RoomRowItem[]; label: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  };
  return (
    <div className="room-row" role="group" aria-label={label}>
      <div className="room-rail" ref={rail}>
        {items.map(item => {
          const body = (
            <>
              <span className="room-photo">
                <Image src={item.src} alt={item.alt} fill sizes="(max-width: 767px) 72vw, 320px" />
              </span>
              {item.name ? <span className="room-name">{item.name}</span> : null}
            </>
          );
          return item.href ? (
            <Link key={item.src} href={item.href} className="room-card">
              {body}
            </Link>
          ) : (
            <span key={item.src} className="room-card">
              {body}
            </span>
          );
        })}
      </div>
      <button type="button" className="room-arrow room-arrow--prev" aria-label="Previous rooms" onClick={() => move(-1)}>
        ‹
      </button>
      <button type="button" className="room-arrow room-arrow--next" aria-label="More rooms" onClick={() => move(1)}>
        ›
      </button>
    </div>
  );
}
