'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatPriceApprox } from '@/lib/format';
import type { NurserySet } from '@/lib/plates';
import { setAside } from '@/context/selectionsStore';

export default function NurserySetSpread({ set }: { set: NurserySet }) {
  return (
    <article className="set">
      <div className="set-floor">
        {set.pieces.map(piece => (
          <Link key={piece.item.slug} href={`/product/${piece.item.slug}`} className="set-piece" aria-label={piece.item.name}>
            <span className="plate-image" style={piece.frame}>
              <Image src={piece.image} alt="" fill sizes="(max-width: 767px) 50vw, 30vw" style={{ objectFit: 'contain' }} />
            </span>
          </Link>
        ))}
      </div>
      <div className="set-caption">
        <h3>{set.title}</h3>
        <p>{set.note}</p>
        <p className="plate-price">{set.pieces.length} pieces, from {formatPriceApprox(set.fromTotal)} together</p>
        <button type="button" className="plate-compare" onClick={() => set.pieces.forEach(p => setAside(p.item))}>
          Set all aside &rarr;
        </button>
      </div>
    </article>
  );
}
