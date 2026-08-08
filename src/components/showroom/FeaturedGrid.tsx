import Link from 'next/link';
import Image from 'next/image';
import { formatPriceApprox } from '@/lib/format';
import { PRODUCT_IMAGE_SIZES } from '@/lib/images';
import type { InventoryItem, ShowroomFeatured } from '@/types';

interface ResolvedFeature {
  productName: string;
  slug: string;
  image: string | null;
  price: number;
  stainName: string;
}

function resolveFeature(
  item: ShowroomFeatured,
  byName: Map<string, InventoryItem>
): ResolvedFeature | null {
  const config = byName.get(item.productName);
  // A featured entry naming a product that no longer exists used to render a
  // red dashed "not found" tile to every visitor. Skip it instead.
  if (!config || !config.slug) return null;

  const stain =
    config.stains.find(s => s.name === (item.stainName || 'Natural') && s.inStock) ||
    config.stains.find(s => s.inStock) ||
    config.stains[0];

  return {
    productName: config.productName,
    slug: config.slug,
    image: stain?.gallery?.[0]?.url || stain?.image || null,
    price: config.basePrice + (stain?.priceAddition || 0),
    stainName: stain?.name ?? '',
  };
}

interface Props {
  featured: ShowroomFeatured[];
  inventory: InventoryItem[];
}

/**
 * Server component. Each tile is a real <Link>.
 *
 * These were previously <div onClick={() => navigate(...)}> with no role,
 * tabIndex or key handler, so every "Featured Cribs" tile on the homepage was
 * unreachable by keyboard and invisible to screen readers as a control - the
 * exact pattern .jules/palette.md warns against.
 */
export default function FeaturedGrid({ featured, inventory }: Props) {
  const byName = new Map<string, InventoryItem>();
  for (const item of inventory) {
    if (!byName.has(item.productName)) byName.set(item.productName, item);
  }

  const source: ShowroomFeatured[] =
    featured.length > 0
      ? featured
      : [...byName.values()].slice(0, 8).map(i => ({ productName: i.productName }));

  const resolved = source
    .map(item => resolveFeature(item, byName))
    .filter((p): p is ResolvedFeature => p !== null);

  if (resolved.length === 0) return null;

  return (
    <section className="featured-section">
      <div className="section-heading">
        <span className="label-caps text-secondary">Curated Collection</span>
        <h2 className="headline-xl text-primary">Featured Cribs</h2>
      </div>
      <div className="featured-grid">
        {resolved.map(product => {
          const href = product.stainName
            ? `/product/${product.slug}?stain=${encodeURIComponent(product.stainName)}`
            : `/product/${product.slug}`;
          return (
            <Link key={product.slug} href={href} className="featured-card product-card-link">
              <article>
                <div className="featured-card-img">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.productName}
                      fill
                      sizes={PRODUCT_IMAGE_SIZES}
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <span className="material-symbols-outlined product-card-placeholder" aria-hidden="true">
                      crib
                    </span>
                  )}
                </div>
                <div className="featured-card-body">
                  <h3>{product.productName}</h3>
                  <p className="price">{formatPriceApprox(product.price)}</p>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
