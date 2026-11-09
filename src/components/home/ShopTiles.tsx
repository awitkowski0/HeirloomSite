import Image from 'next/image';
import Link from 'next/link';
import { getProductsForNode, getTaxonomy } from '@/lib/content';
import { formatPriceApprox } from '@/lib/format';

/* Direct ways into the catalog. Prices and photos come from the live catalogue. */
export default function ShopTiles() {
  const tiles = getTaxonomy()
    .map(node => {
      const products = getProductsForNode(node.slug);
      return {
        slug: node.slug,
        name: node.name,
        count: products.length,
        from: Math.min(...products.map(p => p.minPrice)),
        image: products.find(p => p.defaultImage)?.defaultImage ?? null,
      };
    })
    .filter(tile => tile.count > 0);

  return (
    <section className="home-tiles" aria-label="Shop by category">
      <ul className="home-tiles-grid">
        {tiles.map(tile => (
          <li key={tile.slug}>
            <Link href={`/products/${tile.slug}`} className="home-tile">
              <span className="home-tile-img">
                {tile.image ? (
                  <Image
                    src={tile.image}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 50vw, 25vw"
                    style={{ objectFit: 'contain' }}
                  />
                ) : null}
              </span>
              <span className="home-tile-name">{tile.name}</span>
              <span className="home-tile-price">From {formatPriceApprox(tile.from)}</span>
              <span className="label-caps home-tile-go">Shop {tile.count} pieces &rarr;</span>
            </Link>
          </li>
        ))}
        <li>
          <Link href="#help-me-pick" className="home-tile home-tile--help">
            <span className="home-tile-name">Not sure where to start?</span>
            <span className="home-tile-copy">
              Answer four quick questions and we&rsquo;ll narrow the catalog for you.
            </span>
            <span className="label-caps home-tile-go">Help me pick &rarr;</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
