import Link from 'next/link';
import { BUILDERS, builderForProduct } from '@/lib/builders';
import { getBrowsableProducts } from '@/lib/content';

/* One card per builder: where it is, its own words, and the way in. */
export default function BuilderDirectory() {
  const products = getBrowsableProducts();

  return (
    <ul className="builder-directory">
      {BUILDERS.map(builder => {
        const count = products.filter(p => builderForProduct(p)?.id === builder.id).length;
        return (
          <li key={builder.id} className="builder-entry">
            <p className="label-caps builder-entry__place">{builder.based}</p>
            <h3 className="builder-entry__name">
              <Link href={builder.href}>{builder.name}</Link>
            </h3>
            <blockquote className="builder-entry__quote">
              <p>&ldquo;{builder.intro.text}&rdquo;</p>
              <cite>{builder.intro.source}</cite>
            </blockquote>
            <p className="builder-entry__meta">
              {builder.listed ? `${count} pieces to browse` : 'Available on request'}
              {' · '}
              {builder.leadTime}
            </p>
            <Link href={builder.listed ? `${builder.href}#pieces` : builder.href} className="button-secondary">
              {builder.listed ? `Shop ${builder.name}` : `Ask about ${builder.name}`}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
