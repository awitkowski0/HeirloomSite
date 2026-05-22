import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const CATEGORIES = ['All', 'Cribs', 'Bassinets', 'Mattresses', 'Bedding', 'Furniture', 'Décor', 'Gear'];

export default function Products() {
  const { category: paramCategory } = useParams<{ category: string }>();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const navigate = useNavigate();
  const inventoryData = useQuery(api.inventory.get as any, {});
  const loading = inventoryData === undefined;
  const inventory: any[] = inventoryData || [];

  const [selectedCategory, setSelectedCategory] = useState(
    paramCategory ? paramCategory.charAt(0).toUpperCase() + paramCategory.slice(1) : 'All'
  );

  function getDefaultImage(stains: any[]): string {
    const natural = stains?.find((s: any) => s.name.toLowerCase() === 'natural');
    if (natural?.image) return natural.image;
    const base = stains?.find((s: any) => Number(s.priceAddition) === 0);
    if (base?.image) return base.image;
    return stains?.[0]?.image || '';
  }

  const products = useMemo(() => {
    const map = new Map();
    inventory.forEach(item => {
      const cat = item.category || 'Cribs';
      if (selectedCategory !== 'All' && cat !== selectedCategory) return;
      const pName = item.productName ?? item.cribName;
      if (searchQuery && !pName.toLowerCase().includes(searchQuery.toLowerCase()) && !item.wood?.toLowerCase().includes(searchQuery.toLowerCase()) && !item.description?.toLowerCase().includes(searchQuery.toLowerCase())) return;
      const key = pName;
      if (!map.has(key)) {
        map.set(key, {
          id: encodeURIComponent(key),
          name: key,
          category: cat,
          minPrice: item.basePrice,
          img: getDefaultImage(item.stains),
          woods: [item.wood],
        });
      } else {
        const existing = map.get(key);
        if (item.basePrice < existing.minPrice) existing.minPrice = item.basePrice;
        if (!existing.woods.includes(item.wood)) existing.woods.push(item.wood);
      }
    });
    return Array.from(map.values());
  }, [inventory, selectedCategory, searchQuery]);

  const setCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'All') navigate('/products');
    else navigate(`/products/${cat.toLowerCase()}`);
  };

  if (loading) return (
    <div className="container" style={{ padding: '120px 24px', textAlign: 'center' }}>
      <p className="label-caps text-on-surface-variant">Loading...</p>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{searchQuery ? `Search: ${searchQuery}` : selectedCategory === 'All' ? 'All Products' : selectedCategory} | Heirloom Cribs and More</title>
        <meta name="description" content={searchQuery ? `Search results for "${searchQuery}"` : `Browse our collection of ${selectedCategory === 'All' ? 'handcrafted baby and nursery products' : selectedCategory.toLowerCase()}. Heirloom quality, built for generations.`} />
        <meta property="og:title" content={`${searchQuery ? `Search: ${searchQuery}` : selectedCategory === 'All' ? 'All Products' : selectedCategory} | Heirloom Cribs and More`} />
        <meta property="og:description" content="Handcrafted heirloom-quality cribs and nursery furniture." />
      </Helmet>
      <div className="container products-page" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 className="headline-lg text-primary" style={{ fontSize: '32px', marginBottom: '8px' }}>
            {searchQuery ? `Search: "${searchQuery}"` : selectedCategory === 'All' ? 'Our Collections' : selectedCategory}
          </h1>
          <p className="body-md text-on-surface-variant">
            {searchQuery ? `Results for "${searchQuery}"` : selectedCategory === 'All'
              ? 'Handcrafted heirloom-quality furniture and accessories for your nursery.'
              : `Explore our ${selectedCategory.toLowerCase()} collection.`}
          </p>
        </header>

        <nav aria-label="Product category filter" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '40px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{
                padding: '8px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                background: selectedCategory === cat ? 'var(--primary)' : 'transparent',
                color: selectedCategory === cat ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                fontFamily: 'var(--font-label)', fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s',
              }}>
              {cat}
            </button>
          ))}
        </nav>

        {products.length === 0 ? (
          <section style={{ padding: '60px 0', textAlign: 'center' }}>
            <p className="body-lg text-on-surface-variant">No products found in this category.</p>
          </section>
        ) : (
          <section aria-label="Product grid">
            <div className="featured-grid">
              {products.map(p => (
                <Link to={`/product/${p.id}`} key={p.id} style={{ textDecoration: 'none', display: 'block', color: 'inherit' }}>
                  <article className="featured-card">
                    <div className="featured-card-img">
                    {p.img ? (
                      <img src={p.img} alt={p.name} loading="lazy" />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline-variant)' }}>crib</span>
                    )}
                  </div>
                  <div className="featured-card-body">
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-label)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)' }}>{p.category || 'Crib'}</span>
                    <h3>{p.name}</h3>
                      <p className="price">From ${p.minPrice.toLocaleString()}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
