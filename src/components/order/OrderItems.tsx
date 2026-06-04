interface Item {
  productName: string;
  wood: string;
  stainName: string;
  price: number;
  image: string;
  quantity: number;
}

interface Props {
  items: Item[];
}

export default function OrderItems({ items }: Props) {
  return (
    <div style={{ backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', marginBottom: '32px' }}>
      <h2 className="headline-md" style={{ marginBottom: '24px' }}>Items</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: 'var(--surface-container-high)', borderRadius: '8px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'white' }}>
              <img style={{ width: '100%', height: '100%', objectFit: 'contain' }} src={item.image} alt={item.productName} />
            </div>
            <div style={{ flexGrow: 1 }}>
              <h3 className="body-lg" style={{ fontWeight: 'bold', marginBottom: '2px' }}>{item.productName}</h3>
              <p className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>
                {item.wood.replace(/([A-Z])/g, ' $1').trim()} &bull; {item.stainName}
              </p>
              <p className="body-md" style={{ marginTop: '4px' }}>${item.price.toLocaleString()}.00 x {item.quantity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
