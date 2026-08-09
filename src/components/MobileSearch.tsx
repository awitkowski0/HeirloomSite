import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch, type SearchResult } from '../lib/search';
import SearchResultItem from './SearchResultItem';
import posthog from 'posthog-js';

export default function MobileSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const results = useSearch(query);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleSelect = (r: SearchResult) => {
    posthog.capture('product_selected', { product_name: r.productName, product_category: r.category || 'Crib', source: 'mobile_search_result' });
    setOpen(false);
    setQuery('');
    const params = new URLSearchParams();
    if (r.matchedStain) params.set('stain', r.matchedStain);
    navigate(`/product/${r.slug}?${params.toString()}`);
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    setOpen(false);
    setQuery('');
    posthog.capture('search_submitted', { result_count: results.length, search_surface: 'mobile' });
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <button className="nav-item" onClick={() => setOpen(true)} aria-label="Search">
        <span className="material-symbols-outlined">search</span>
        <span className="nav-label">Search</span>
      </button>

      {open && (
        <div className="mobile-search-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Search products..."
              aria-label="Search products"
              style={{ flex: 1 }}
              autoFocus
            />
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {results.slice(0, 10).map(r => (
            <SearchResultItem
              key={r.id}
              result={r}
              onSelect={handleSelect}
            />
          ))}

          {query && results.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '24px', fontSize: '14px' }}>
              No results for "{query}"
            </p>
          )}
        </div>
      )}
    </>
  );
}
