interface Props {
  paymentIntentId: string;
  status: string;
  email: string;
}

export default function OrderDetails({ paymentIntentId, status, email }: Props) {
  return (
    <div style={{ backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', marginBottom: '32px' }}>
      <h2 className="headline-md" style={{ marginBottom: '24px' }}>Order Details</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="label-caps text-on-surface-variant">Order ID</span>
          <span className="body-md">{paymentIntentId}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="label-caps text-on-surface-variant">Status</span>
          <span className="body-md" style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{status}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="label-caps text-on-surface-variant">Email</span>
          <span className="body-md">{email}</span>
        </div>
      </div>
    </div>
  );
}
