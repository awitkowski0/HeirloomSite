import Image from 'next/image';
import Link from 'next/link';
import { formatPriceApprox } from '@/lib/format';
import type { ShopItem } from '@/lib/shop';

function ChipList({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0) return <span className="shop-compare__gap">{empty}</span>;
  return (
    <ul className="feature-chips">
      {values.map(v => <li key={v}>{v}</li>)}
    </ul>
  );
}

/* Only badges a real difference: a tie between pieces is not a win for one. */
function bestOf(items: ShopItem[], value: (i: ShopItem) => number | null): string | null {
  const known = items.filter(i => value(i) !== null);
  if (known.length < 2) return null;
  const lowest = Math.min(...known.map(i => value(i) as number));
  const winners = known.filter(i => value(i) === lowest);
  return winners.length === 1 ? winners[0].slug : null;
}

export default function CompareTable({ items }: { items: ShopItem[] }) {
  const cheapest = bestOf(items, i => i.price);
  const soonest = bestOf(items, i => i.leadWeeksMax);
  const row = (label: string, cell: (i: ShopItem) => React.ReactNode) => (
    <tr>
      <th scope="row">{label}</th>
      {items.map(i => <td key={i.slug}>{cell(i)}</td>)}
    </tr>
  );

  return (
    <div className="shop-compare" tabIndex={0} role="region" aria-label="Comparison table">
      <table>
        <thead>
          <tr>
            <td />
            {items.map(i => (
              <th key={i.slug} scope="col">
                <span className="shop-compare__img">
                  {i.image ? <Image src={i.image} alt="" fill sizes="240px" style={{ objectFit: 'contain' }} /> : null}
                </span>
                <Link href={`/product/${i.slug}`}>{i.name}</Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row('Price', i => (
            <>
              From {formatPriceApprox(i.price)}
              {i.slug === cheapest && <span className="shop-badge">Lowest price</span>}
            </>
          ))}
          {row('Built by', i => (i.builder && i.builderHref ? <Link href={i.builderHref}>{i.builder}</Link> : 'Ask us'))}
          {row('Workshop', i => i.state ?? 'Ask us')}
          {row('Lead time', i => (
            <>
              {i.leadTime ?? 'Ask us'}
              {i.slug === soonest && <span className="shop-badge">Soonest</span>}
            </>
          ))}
          {row('Look', i => (i.top ? `${i.top} top, ${i.front?.toLowerCase()} front` : 'Not applicable'))}
          {row('Finishes', i => (i.finishes > 1 ? i.finishes : 'Ask us'))}
          {items.some(i => i.dimensions) && row('Size', i => i.dimensions ?? 'Ask us')}
          {row('How it’s built, per the builder', i => (
            <ChipList values={i.buildFeatures} empty="Nothing on file yet" />
          ))}
          {row('Safety, per the builder', i => (
            <ChipList values={i.safetyFeatures} empty="Ask us for the builder's statement" />
          ))}
        </tbody>
      </table>
    </div>
  );
}
