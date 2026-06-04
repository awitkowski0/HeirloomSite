import type { Stain } from '../../types';

const SWATCH_COLORS: Record<string, string> = {
  natural: '#DEB887', slate: '#5A6064', smoke: '#3b3c36', cherry: '#651c14',
  driftwood: '#a39887', walnut: '#5C4033', ebony: '#3B3B3B', mahogany: '#4A2C2A',
  oak: '#B89B72', maple: '#DEB887', espresso: '#2C1E16', white: '#F5F5F0',
  grey: '#8C8C8C', gray: '#8C8C8C', black: '#2D2D2D',
};

function swatchColor(name: string): string {
  const n = name.toLowerCase();
  for (const [key, color] of Object.entries(SWATCH_COLORS)) {
    if (n.includes(key)) return color;
  }
  return '#DEB887';
}

interface Props {
  stains: Stain[];
  selected: string;
  onSelect: (name: string) => void;
}

export default function StainSelector({ stains, selected, onSelect }: Props) {
  return (
    <section className="config-section desktop-only">
      <div className="config-header">
        <h3 className="label-caps">02. Choose Stain Finish</h3>
      </div>
      <div className="stain-list" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
        {stains.map(stain => (
          <button
            key={stain.name}
            disabled={!stain.inStock}
            style={{ opacity: stain.inStock ? 1 : 0.5, cursor: stain.inStock ? 'pointer' : 'not-allowed' }}
            className={`stain-button ${selected === stain.name ? 'selected' : ''}`}
            onClick={() => onSelect(stain.name)}
          >
            <div className="stain-swatch" style={{ backgroundColor: swatchColor(stain.name), overflow: 'hidden', position: 'relative' }}>
              {stain.image ? (
                <img src={stain.image} alt={stain.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              ) : null}
            </div>
            <div className="stain-info">
              <p className="body-md stain-name">
                {stain.name}
                {stain.priceAddition > 0 && <span style={{ color: 'var(--secondary)' }}> (+${stain.priceAddition})</span>}
                {!stain.inStock && <span style={{ color: 'var(--error)', fontSize: '12px', marginLeft: '8px' }}>[Out of Stock]</span>}
              </p>
              <p className="label-caps stain-desc">
                {stain.name.toLowerCase().includes('natural') ? "Enhances the wood's inherent character" : "Sophisticated artisan pigment"}
              </p>
            </div>
            {selected === stain.name && <span className="material-symbols-outlined stain-check">check_circle</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
