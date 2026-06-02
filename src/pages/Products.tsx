import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useContent } from '../useContent';
import CategoryFilter from '../components/products/CategoryFilter';
import ProductCard from '../components/products/ProductCard';

const CATEGORIES = ['All', 'Cribs', 'Bassinets', 'Mattresses', 'Bedding', 'Furniture', 'Décor', 'Gear'];

function getDefaultImage(stains: Array<{ name: string; priceAddition: number; image?: string }>): string {
  const natural = stains.find(s => s.name.toLowerCase() === 'natural');
  if (natural?.image) return natural.image;
  const base = stains.find(s => Number(s.priceAddition) === 0);
  if (base?.image) return base.image;
  return stains?.[0]?.image || '';
}

export default function Products() {
  const { category: paramCategory } = useParams<{ category: string }>();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const navigate = useNavigate();
  const { inventory, loading } = useContent();

  const [selectedCategory, setSelectedCategory] = useState(
    paramCategory ? paramCategory.charAt(0).toUpperCase() + paramCategory.slice(1) : 'All'
  );

  const products = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string; minPrice: number; img: string }>();
    inventory.forEach(item => {
      const cat = item.category || 'Cribs';
      if (selectedCategory !== 'All' && cat !== selectedCategory) return;
      const pName = item.productName;
      if (searchQuery && !pName.toLowerCase().includes(searchQuery.toLowerCase())) return;
      const key = pName;
      const existing = map.get(key);
      if (existing) {
        if (item.basePrice < existing.minPrice) existing.minPrice = item.basePrice;
      } else {
        map.set(key, {
          id: encodeURIComponent(key),
          name: key,
          category: cat,
          minPrice: item.basePrice,
          img: getDefaultImage(item.stains),
        });
      }
    });
    return Array.from(map.values());
  }, [inventory, selectedCategory, searchQuery]);

  const handleCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'All') navigate('/products');
    else navigate(`/products/${cat.toLowerCase()}`);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '120px 24px', textAlign: 'center' }}>
        <p className="label-caps text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{searchQuery ? `Search: ${searchQuery}` : selectedCategory === 'All' ? 'All Products' : selectedCategory} | Heirloom Cribs and More</title>
        <meta name="description" content={searchQuery ? `Search results for "${searchQuery}"` : `Browse our collection of ${selectedCategory === 'All' ? 'handcrafted baby and nursery products' : selectedCategory.toLowerCase()}.`} />
      </Helmet>
      <div className="container products-page" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 className="headline-lg text-primary" style={{ fontSize: '32px', marginBottom: '8px' }}>
            {searchQuery ? `Search: "${searchQuery}"` : selectedCategory === 'All' ? 'Our Collections' : selectedCategory}
          </h1>
        </header>

        <CategoryFilter categories={CATEGORIES} selected={selectedCategory} onSelect={handleCategory} />

        {products.length === 0 ? (
          <section style={{ padding: '60px 0', textAlign: 'center' }}>
            <p className="body-lg text-on-surface-variant">No products found in this category.</p>
          </section>
        ) : (
          <section aria-label="Product grid">
            <div className="featured-grid">
              {products.map(p => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
