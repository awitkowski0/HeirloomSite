import type { Stain } from '../../types';

interface Props {
  stains: Stain[];
  selected: string;
  onSelect: (name: string) => void;
}

const SWATCH_COLORS: Record<string, string> = {
  natural: '#DEB887', slate: '#5A6064', smoke: '#3b3c36', cherry: '#651c14',
  driftwood: '#a39887', walnut: '#5C4033', ebony: '#3B3B3B', mahogany: '#4A2C2A',
  oak: '#B89B72', maple: '#DEB887', espresso: '#2C1E16', white: '#F5F5F0',
};

function swatchColor(name: string): string {
  const n = name.toLowerCase();
  for (const [key, color] of Object.entries(SWATCH_COLORS)) {
    if (n.includes(key)) return color;
  }
  return '#DEB887';
}

export default function StainStripMobile({ stains, selected, onSelect }: Props) {
  return (
    <div className="stain-strip-mobile">
      {stains.map(stain => (
        <button
          key={stain.name}
          disabled={!stain.inStock}
          className={`stain-strip-swatch ${selected === stain.name ? 'selected' : ''}`}
          onClick={() => onSelect(stain.name)}
          style={{ opacity: stain.inStock ? 1 : 0.5 }}
        >
          <div className="stain-swatch" style={{ backgroundColor: swatchColor(stain.name), overflow: 'hidden', position: 'relative' }}>
            {stain.image ? (
              <img src={stain.image} alt={stain.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}
