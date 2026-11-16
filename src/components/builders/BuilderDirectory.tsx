import Image from 'next/image';
import Link from 'next/link';
import { BUILDERS } from '@/lib/builders';
import { storeProducts } from '@/lib/builder-stores';
import { formatPriceApprox } from '@/lib/format';

/* The list of stores. A row per builder, generated from its record. */
export default function BuilderDirectory() {
  return (
    <ul className="store-list">
      {BUILDERS.map(builder => {
        const products = storeProducts(builder);
        const from = products.length > 0 ? Math.min(...products.map(p => p.minPrice)) : null;
        return (
          <li key={builder.id} className={builder.banner ? 'store-entry' : 'store-entry store-entry--plain'}>
            {builder.banner ? (
              <Link href={builder.href} className="store-entry__photo" tabIndex={-1} aria-hidden="true">
                <Image src={builder.banner.image} alt="" fill sizes="(max-width: 859px) 92vw, 420px" />
              </Link>
            ) : null}
            <div className="store-entry__body">
              <h2><Link href={builder.href} className="builder-name">{builder.name}</Link></h2>
              <blockquote>
                <p>&ldquo;{builder.intro.text}&rdquo;</p>
                <cite>From {builder.name}</cite>
              </blockquote>
              <p className="small">
                {from === null ? 'Available on request' : `${products.length} pieces · From ${formatPriceApprox(from)}`}
                {' · '}
                {builder.leadTime}
              </p>
              <p><Link href={builder.href} className="link">Visit the store</Link></p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
