import { Link } from 'react-router-dom';

interface Props {
  id: string;
  name: string;
  category: string;
  minPrice: number;
  img: string;
}

export default function ProductCard({ id, name, category, minPrice, img }: Props) {
  return (
    <Link to={`/product/${id}`} className="featured-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article>
        <div className="featured-card-img">
          {img ? (
            <img src={img} alt={name} loading="lazy" />
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline-variant)' }}>crib</span>
          )}
        </div>
        <div className="featured-card-body">
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-label)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)' }}>
            {category || 'Crib'}
          </span>
          <h3>{name}</h3>
          <p className="price">From ${minPrice.toLocaleString()}</p>
        </div>
      </article>
    </Link>
  );
}
