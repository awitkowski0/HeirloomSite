import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch, type SearchResult } from '../lib/search';

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
    setOpen(false);
    setQuery('');
    const params = new URLSearchParams();
    if (r.matchedStain) params.set('stain', r.matchedStain);
    navigate(`/product/${encodeURIComponent(r.productName)}?${params.toString()}`);
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    setOpen(false);
    setQuery('');
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
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              style={{
                display: 'flex', gap: '12px', padding: '12px', borderRadius: '8px',
                border: 'none', background: 'none', cursor: 'pointer', width: '100%',
                textAlign: 'left', alignItems: 'center', marginBottom: '4px',
              }}
            >
              {r.image ? (
                <img src={r.image} alt="" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, backgroundColor: 'white' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '6px', backgroundColor: 'var(--surface-container-high)', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>{r.productName}</div>
                <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                  {r.wood.replace(/([A-Z])/g, ' $1').trim()}
                  {r.matchedStain ? <span> &bull; {r.matchedStain}</span> : null}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>
                  ${r.basePrice.toLocaleString()}.00
                </div>
              </div>
            </button>
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
