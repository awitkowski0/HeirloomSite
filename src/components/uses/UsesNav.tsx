import Image from 'next/image';
import Link from 'next/link';
import { getBrowsableProducts } from '@/lib/content';
import { photoRank } from '@/lib/photo-notes';
import { toShopItems } from '@/lib/shop';
import { USE_TAGS } from '@/lib/uses';

const label = (tag: string) => `${tag[0]}${tag.slice(1).toLowerCase()}`;

/* A way into the catalog by what a piece will be used for, each with a real photo. */
export default function UsesNav() {
  const items = toShopItems(getBrowsableProducts());
  const tiles = USE_TAGS.flatMap(use => {
    const pieces = items.filter(i => i.uses.includes(use.tag) && i.image).sort((a, b) => photoRank(a.slug) - photoRank(b.slug));
    return pieces[0] ? [{ ...use, image: pieces[0].image as string }] : [];
  });
  return (
    <nav className="uses-nav" aria-label="Shop by use">
      <p className="small">Shop by use</p>
      <ul>
        {tiles.map(t => (
          <li key={t.slug}>
            <Link href={`/uses/${t.slug}`}>
              <span className="uses-photo"><Image src={t.image} alt="" fill sizes="88px" /></span>
              {label(t.tag)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
