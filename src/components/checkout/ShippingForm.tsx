interface Props {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  onChange: (field: string, value: string) => void;
}

export default function ShippingForm({ firstName, lastName, address, city, state, zip, onChange }: Props) {
  return (
    <section>
      <h2 className="headline-md" style={{ marginBottom: '24px' }}>Shipping Destination</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }} htmlFor="firstName">FIRST NAME</label>
          <input id="firstName" type="text" value={firstName} onChange={e => onChange('firstName', e.target.value)}
            style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
        </div>
        <div>
          <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }} htmlFor="lastName">LAST NAME</label>
          <input id="lastName" type="text" value={lastName} onChange={e => onChange('lastName', e.target.value)}
            style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }} htmlFor="address">ADDRESS</label>
          <input id="address" type="text" placeholder="123 Heritage Lane" value={address} onChange={e => onChange('address', e.target.value)}
            style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
        </div>
        <div>
          <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }} htmlFor="city">CITY</label>
          <input id="city" type="text" value={city} onChange={e => onChange('city', e.target.value)}
            style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }} htmlFor="state">STATE</label>
            <input id="state" type="text" value={state} onChange={e => onChange('state', e.target.value)}
              style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
          </div>
          <div>
            <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }} htmlFor="zip">ZIP CODE</label>
            <input id="zip" type="text" value={zip} onChange={e => onChange('zip', e.target.value)}
              style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
