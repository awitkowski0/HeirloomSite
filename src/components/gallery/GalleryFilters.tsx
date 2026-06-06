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
        className={`filter-pill-btn ${selected === 'All Collections' ? 'filter-pill-btn--active' : ''}`}
        onClick={onReset}
      >
        Our Cribs
      </button>

      <div className="filter-pill-divider" />

      {woods.map(w => (
        <button
          key={w}
          className={`filter-pill-btn ${selected === w ? 'filter-pill-btn--active' : ''}`}
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
    <div className="stain-filter-container">
      {stains.map(stain => (
        <button
          key={stain}
          className={`stain-pill-btn ${selected === stain ? 'stain-pill-btn--active' : ''}`}
          onClick={() => onSelect(stain)}
        >
          {stain}
        </button>
      ))}
    </div>
  );
}
