'use client';

import Image from 'next/image';
import { TONES, toneOf, type Tone } from '@/lib/finish-tones';

export interface FinishTile {
  key: string;
  label: string;
  image: string;
}

/* Every finish in the same frame, grouped so dark can be judged against dark. */
export default function FinishWall({
  tiles,
  active,
  onChoose,
}: {
  tiles: FinishTile[];
  active: number;
  onChoose: (index: number) => void;
}) {
  const groups: { id: Tone; label: string; entries: { tile: FinishTile; index: number }[] }[] = TONES.map(t => ({
    ...t,
    entries: tiles
      .map((tile, index) => ({ tile, index }))
      .filter(({ tile }) => (toneOf(tile.key) ?? 'mid') === t.id),
  }));

  return (
    <section className="config-section finish-wall" aria-label="Choose a finish">
      <div className="finish-wall-head">
        <h3 className="label-caps">Finish</h3>
        <p role="status" aria-live="polite">{tiles[active]?.label}</p>
      </div>
      {groups.filter(g => g.entries.length > 0).map(group => (
        <div key={group.id} className="finish-group">
          <p className="finish-group-label">{group.label}</p>
          <ul className="finish-tiles">
            {group.entries.map(({ tile, index }) => (
              <li key={tile.key}>
                <button type="button" className="finish-tile" aria-pressed={index === active} onClick={() => onChoose(index)}>
                  <span className="finish-tile-img">
                    <Image src={tile.image} alt="" fill sizes="110px" style={{ objectFit: 'contain' }} />
                  </span>
                  <span className="finish-tile-name">{tile.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
