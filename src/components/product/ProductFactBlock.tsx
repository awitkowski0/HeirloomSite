import { formatFactLine, type FactLine } from '@/lib/product-fact-block';

/** Plain-text Muse MU4 fact block (Brand C 6949790350). Server-rendered, no invented heading. */
export default function ProductFactBlock({ lines }: { lines: FactLine[] }) {
  return (
    <section className="product-fact-block" aria-label="Product facts">
      {lines.map(line => (
        <p key={line.label} className="product-fact-line">
          {formatFactLine(line)}
        </p>
      ))}
    </section>
  );
}
