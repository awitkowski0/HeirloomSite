import { getBrowsableProducts } from '@/lib/content';
import { toShopItems } from '@/lib/shop';
import { USE_TAGS } from '@/lib/uses';
import UseTags from './UseTags';

/* A way into the catalog by what the piece will be used for. */
export default function UsesNav() {
  const items = toShopItems(getBrowsableProducts());
  const tags = USE_TAGS.map(u => u.tag).filter(tag => items.some(i => i.uses.includes(tag)));
  return (
    <nav className="uses-nav" aria-label="Shop by what it can be">
      <p className="label-caps">What it can be</p>
      <UseTags uses={tags} />
    </nav>
  );
}
