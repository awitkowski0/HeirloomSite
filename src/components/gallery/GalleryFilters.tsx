interface WoodFilterProps {
  woods: string[];
  selected: string;
  onSelect: (wood: string) => void;
  onReset: () => void;
}

export function WoodFilter({ woods, selected, onSelect, onReset }: WoodFilterProps) {
  return (
    <div className="filter-pills">
      <button
        style={{
          padding: '12px 24px', borderRadius: '100px', border: 'none',
          background: selected === 'All Collections' ? 'var(--primary)' : 'transparent',
          color: selected === 'All Collections' ? 'var(--on-primary)' : 'var(--on-surface-variant)',
          fontFamily: 'var(--font-label)', fontSize: '12px', fontWeight: '700',
          letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
          transition: 'all 0.3s',
        }}
        onClick={onReset}
      >
        Our Cribs
      </button>

      <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--outline-variant)' }} />

      {woods.map(w => (
        <button
          key={w}
          style={{
            padding: '12px 24px', borderRadius: '100px', border: 'none',
            background: selected === w ? 'var(--primary)' : 'transparent',
            color: selected === w ? 'var(--on-primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-label)', fontSize: '12px', fontWeight: '700',
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'all 0.3s',
          }}
          onClick={() => onSelect(w)}
        >
          {w.replace(/([A-Z])/g, ' $1').trim()}
        </button>
      ))}
    </div>
  );
}

interface StainFilterProps {
  stains: string[];
  selected: string;
  onSelect: (stain: string) => void;
}

export function StainFilter({ stains, selected, onSelect }: StainFilterProps) {
  if (stains.length === 0) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {stains.map(stain => (
        <button
          key={stain}
          style={{
            padding: '8px 20px', borderRadius: '100px',
            border: '1px solid var(--outline-variant)',
            background: selected === stain ? 'var(--secondary-container)' : 'transparent',
            color: selected === stain ? 'var(--on-secondary-container)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-label)', fontSize: '11px', fontWeight: '600',
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => onSelect(stain)}
        >
          {stain}
        </button>
      ))}
    </div>
  );
}
