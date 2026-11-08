import { builderForProduct, getBuilder, type BuilderId } from '@/lib/builders';
import { getBrowsableProducts } from '@/lib/content';
import VisibleProductGrid from '@/components/products/VisibleProductGrid';

const CATEGORY_ORDER = ['Cribs', 'Mini Cribs', 'Dressers', 'Chests', 'Changing Tables', 'Nightstands'];
const rank = (category: string | null) => {
  const i = CATEGORY_ORDER.indexOf(category ?? '');
  return i === -1 ? CATEGORY_ORDER.length : i;
};

/* A builder's whole listed range, cribs first. Anchored so cards can link to it. */
export default function BuilderProducts({ builderId }: { builderId: BuilderId }) {
  const builder = getBuilder(builderId);
  const products = getBrowsableProducts()
    .filter(p => builderForProduct(p)?.id === builderId)
    .sort((a, b) => rank(a.category) - rank(b.category));

  if (products.length === 0) return null;

  return (
    <section id="pieces" className="builder-pieces" aria-labelledby="builder-pieces-heading">
      <h2 id="builder-pieces-heading" className="headline-md">
        Shop {builder.name}
      </h2>
      <VisibleProductGrid products={products} />
    </section>
  );
}
