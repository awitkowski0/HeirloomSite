'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { RoomImage } from '@/lib/room-images';

export interface RoomRowItem extends RoomImage {
  href: string;
  name: string;
}

/* A small sliding row of room shots. Swipe on a phone, arrows with a mouse; never advances by itself. */
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
        {items.map(item => (
          <Link key={item.src} href={item.href} className="room-card">
            <span className="room-photo">
              <Image src={item.src} alt={item.alt} fill sizes="(max-width: 859px) 72vw, 320px" />
            </span>
            <span className="room-name">{item.name}</span>
          </Link>
        ))}
      </div>
      <button type="button" className="gallery-arrow gallery-arrow--prev" aria-label="Previous rooms" onClick={() => move(-1)}>‹</button>
      <button type="button" className="gallery-arrow gallery-arrow--next" aria-label="More rooms" onClick={() => move(1)}>›</button>
    </div>
  );
}
