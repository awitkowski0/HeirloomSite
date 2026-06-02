import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Order {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  items: Array<{
    productName: string;
    cribName?: string;
    wood: string;
    stainName: string;
    price: number;
    image: string;
    quantity: number;
    addons?: Array<{ name: string; price: number; stainName?: string }>;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paymentIntentId: string;
  status: string;
}

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/orders/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        setOrder(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '120px 24px', textAlign: 'center', minHeight: '80vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--outline-variant)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p className="label-caps text-on-surface-variant">Loading order details...</p>
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <h2 className="headline-lg">Order not found</h2>
        <p className="body-lg" style={{ marginTop: '16px', marginBottom: '32px' }}>We couldn't find this order. Please check the link or contact support.</p>
        <Link to="/gallery" className="add-to-cart" style={{ width: 'auto', padding: '12px 32px' }}>Browse Gallery</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--primary)', marginBottom: '16px' }}>check_circle</span>
          <h1 className="headline-lg" style={{ marginBottom: '8px' }}>Order Confirmed!</h1>
          <p className="body-lg text-on-surface-variant">Thank you, {order.firstName}. Your heirloom is being prepared.</p>
        </div>

        <div style={{ backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', marginBottom: '32px' }}>
          <h2 className="headline-md" style={{ marginBottom: '24px' }}>Order Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps text-on-surface-variant">Order ID</span>
              <span className="body-md">{order.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps text-on-surface-variant">Status</span>
              <span className="body-md" style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{order.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps text-on-surface-variant">Email</span>
              <span className="body-md">{order.email}</span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', marginBottom: '32px' }}>
          <h2 className="headline-md" style={{ marginBottom: '24px' }}>Shipping To</h2>
          <div className="body-md">
            <p>{order.firstName} {order.lastName}</p>
            <p>{order.address}</p>
            <p>{order.city}, {order.state} {order.zip}</p>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', marginBottom: '32px' }}>
          <h2 className="headline-md" style={{ marginBottom: '24px' }}>Items</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: 'var(--surface-container-high)', borderRadius: '8px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'white' }}>
                  <img style={{ width: '100%', height: '100%', objectFit: 'contain' }} src={item.image} alt={item.cribName || item.productName} />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <h3 className="body-lg" style={{ fontWeight: 'bold', marginBottom: '2px' }}>{item.cribName || item.productName}</h3>
                  <p className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>
                    {item.wood.replace(/([A-Z])/g, ' $1').trim()} &bull; {item.stainName}
                  </p>
                  <p className="body-md" style={{ marginTop: '4px' }}>${item.price.toLocaleString()}.00 x {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', marginBottom: '48px' }}>
          <h2 className="headline-md" style={{ marginBottom: '24px' }}>Payment Summary</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
              <span>Subtotal</span>
              <span>${order.subtotal.toLocaleString()}.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
              <span>Shipping</span>
              <span>${order.shipping.toLocaleString()}.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
              <span>Estimated Tax</span>
              <span>${order.tax.toLocaleString()}.00</span>
            </div>
            <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="headline-md" style={{ fontSize: '20px' }}>Total</span>
              <span className="headline-md text-primary" style={{ fontSize: '24px' }}>${order.total.toLocaleString()}.00</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link to="/gallery" className="add-to-cart" style={{ width: 'auto', padding: '12px 32px', display: 'inline-block' }}>Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
