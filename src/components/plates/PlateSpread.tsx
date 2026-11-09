'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPriceApprox } from '@/lib/format';
import type { Plate, PlateSide } from '@/lib/plates';
import UseTags from '@/components/uses/UseTags';
import { compareOnly, requestCompareOpen } from '@/context/selectionsStore';

type Side = 'left' | 'right';

function Page({
  side,
  image,
  priority,
  picked,
  onPick,
}: {
  side: PlateSide;
  image: string;
  priority: boolean;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <div className="plate-page" data-picked={picked}>
      <button type="button" className="plate-frame" aria-label={`Pick ${side.item.name}${side.note ? `, ${side.note}` : ''}`} aria-pressed={picked} onClick={onPick}>
        <span className="plate-image" style={side.frame}>
          <Image src={image} alt="" fill priority={priority} sizes="(max-width: 767px) 80vw, 60vw" style={{ objectFit: 'contain' }} />
        </span>
      </button>
      <div className="plate-caption">
        <Link href={`/product/${side.item.slug}`} className="plate-name">{side.item.name}</Link>
        {side.note && <p className="plate-note">{side.note}</p>}
        <p className="plate-price">From {formatPriceApprox(side.item.price)}</p>
        <button type="button" className="plate-pick" aria-pressed={picked} onClick={onPick}>
          {picked ? '✓ This one' : 'This one'}
        </button>
        <UseTags uses={side.item.uses} note={side.item.usesNote} />
      </div>
    </div>
  );
}

export default function PlateSpread({
  plate,
  priority = false,
  pick,
  onPick,
}: {
  plate: Plate;
  priority?: boolean;
  pick: Side | null;
  onPick: (side: Side) => void;
}) {
  const [finish, setFinish] = useState(plate.finishes[0]?.name ?? null);
  const chosen = plate.finishes.find(f => f.name === finish);
  const onePiece = plate.left.item.slug === plate.right.item.slug;

  return (
    <article id={plate.id} className="plate" aria-labelledby={`${plate.id}-title`}>
      <header className="plate-head">
        <p className="label-caps">This or That</p>
        <h2 id={`${plate.id}-title`}>{plate.title}</h2>
      </header>
      <div className="plate-spread">
        <Page side={plate.left} image={chosen?.left ?? plate.left.image} priority={priority} picked={pick === 'left'} onPick={() => onPick('left')} />
        <Page side={plate.right} image={chosen?.right ?? plate.right.image} priority={priority} picked={pick === 'right'} onPick={() => onPick('right')} />
      </div>
      {plate.finishes.length > 0 && (
        <div className="plate-finishes" role="group" aria-label="See both in a finish">
          {plate.finishes.map(f => (
            <button key={f.name} type="button" className="plate-finish" aria-pressed={f.name === finish} onClick={() => setFinish(f.name)}>
              {f.name}
            </button>
          ))}
        </div>
      )}
      <p className="plate-opinion">{plate.opinion}</p>
      {plate.colorNote && <p className="plate-fine">Digital preview. Colors are a guide, so ask us about your finish.</p>}
      {!onePiece && (
        <button
          type="button"
          className="plate-compare"
          onClick={() => {
            compareOnly([plate.left.item, plate.right.item]);
            requestCompareOpen();
          }}
        >
          Compare these two &rarr;
        </button>
      )}
    </article>
  );
}
