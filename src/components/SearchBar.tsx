import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch, type SearchResult } from '../lib/search';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const results = useSearch(query);

  const showDropdown = open && focused && results.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open && query) {
      const id = setTimeout(() => setOpen(true), 0);
      return () => clearTimeout(id);
    }
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    setQuery('');
    setOpen(false);
    const params = new URLSearchParams();
    if (r.matchedStain) params.set('stain', r.matchedStain);
    navigate(`/product/${encodeURIComponent(r.productName)}?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <form onSubmit={handleSubmit} role="search" style={{ display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search products, stains, woods..."
          aria-label="Search products"
          style={{
            padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)',
            fontSize: '13px', width: '220px', outline: 'none',
          }}
        />
        <button type="submit" className="icon-btn" aria-label="Submit search" style={{ padding: '6px' }}>
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '20px' }}>search</span>
        </button>
      </form>

      {showDropdown && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 0, width: '380px',
            backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid var(--outline-variant)',
            zIndex: 1000, padding: '8px', marginTop: '4px',
          }}
        >
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              style={{
                display: 'flex', gap: '12px', padding: '10px', borderRadius: '8px',
                border: 'none', background: 'none', cursor: 'pointer', width: '100%',
                textAlign: 'left', alignItems: 'center', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-container-high)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {r.image ? (
                <img src={r.image} alt="" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, backgroundColor: 'white' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '6px', backgroundColor: 'var(--surface-container-high)', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.productName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                  {r.wood.replace(/([A-Z])/g, ' $1').trim()}
                  {r.matchedStain ? <span> &bull; {r.matchedStain}</span> : null}
                  {r.category ? <span> &bull; {r.category}</span> : null}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>
                  ${r.basePrice.toLocaleString()}.00
                </div>
              </div>
            </button>
          ))}
          <button
            onClick={handleSubmit}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              padding: '10px', borderRadius: '8px', border: 'none', background: 'none',
              cursor: 'pointer', width: '100%', fontSize: '12px', color: 'var(--on-surface-variant)',
              fontWeight: 600, letterSpacing: '0.05em', borderTop: '1px solid var(--outline-variant)',
              marginTop: '4px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-container-high)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            See all {results.length} results
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}
