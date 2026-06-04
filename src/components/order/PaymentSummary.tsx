interface Props {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export default function PaymentSummary({ subtotal, shipping, tax, total }: Props) {
  return (
    <div style={{ backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', marginBottom: '48px' }}>
      <h2 className="headline-md" style={{ marginBottom: '24px' }}>Payment Summary</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
          <span>Subtotal</span><span>${subtotal.toLocaleString()}.00</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
          <span>Shipping</span><span>${shipping.toLocaleString()}.00</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
          <span>Estimated Tax</span><span>${tax.toLocaleString()}.00</span>
        </div>
        <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="headline-md" style={{ fontSize: '20px' }}>Total</span>
          <span className="headline-md text-primary" style={{ fontSize: '24px' }}>${total.toLocaleString()}.00</span>
        </div>
      </div>
    </div>
  );
}
