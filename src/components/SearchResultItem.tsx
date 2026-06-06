import type { SearchResult } from '../lib/search';

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  compact?: boolean;
}

export default function SearchResultItem({ result, onSelect, compact = false }: SearchResultItemProps) {
  const r = result;

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'var(--surface-container-high)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'none';
  };

  return (
    <button
      onClick={() => onSelect(r)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        gap: '12px',
        padding: compact ? '10px' : '12px',
        borderRadius: '8px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        alignItems: 'center',
        marginBottom: compact ? '0' : '4px',
        transition: 'background 0.15s',
      }}
    >
      {r.image ? (
        <img
          src={r.image}
          alt=""
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '6px',
            objectFit: 'cover',
            flexShrink: 0,
            backgroundColor: 'white',
          }}
        />
      ) : (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '6px',
            backgroundColor: 'var(--surface-container-high)',
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: compact ? '13px' : '14px',
            fontWeight: 600,
            color: 'var(--on-surface)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {r.productName}
        </div>
        <div
          style={{
            fontSize: compact ? '11px' : '12px',
            color: 'var(--on-surface-variant)',
            marginTop: '2px',
          }}
        >
          {r.wood.replace(/([A-Z])/g, ' $1').trim()}
          {r.matchedStain ? <span> &bull; {r.matchedStain}</span> : null}
          {r.category ? <span> &bull; {r.category}</span> : null}
        </div>
        <div
          style={{
            fontSize: compact ? '13px' : '14px',
            fontWeight: 600,
            color: 'var(--primary)',
            marginTop: '2px',
          }}
        >
          ${r.basePrice.toLocaleString()}.00
        </div>
      </div>
    </button>
  );
}
