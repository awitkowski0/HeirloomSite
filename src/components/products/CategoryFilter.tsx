interface Props {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: Props) {
  return (
    <nav aria-label="Product category filter" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '40px' }}>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          aria-pressed={selected === cat}
          style={{
            padding: '8px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer',
            background: selected === cat ? 'var(--primary)' : 'transparent',
            color: selected === cat ? 'var(--on-primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-label)', fontSize: '12px', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s',
          }}
        >
          {cat}
        </button>
      ))}
    </nav>
  );
}
