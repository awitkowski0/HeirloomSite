interface Props {
  woods: string[];
  selected: string;
  onSelect: (wood: string) => void;
  disabled: (wood: string) => boolean;
}

export default function WoodSelector({ woods, selected, onSelect, disabled }: Props) {
  return (
    <section className="config-section">
      <div className="config-header">
        <h3 className="label-caps">01. Select Wood Species</h3>
      </div>
      <div className="wood-grid">
        {woods.map(wood => {
          const isDisabled = disabled(wood);
          return (
            <button
              key={wood}
              disabled={isDisabled}
              style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
              className={`wood-chip ${selected === wood ? 'selected' : ''}`}
              onClick={() => onSelect(wood)}
            >
              {wood.replace(/([A-Z])/g, ' $1').trim()}
              {isDisabled && <span style={{ fontSize: '9px', color: 'var(--error)', marginLeft: '4px' }}>Sold Out</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
