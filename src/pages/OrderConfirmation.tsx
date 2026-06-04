import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrder } from '../api';
import OrderDetails from '../components/order/OrderDetails';
import OrderItems from '../components/order/OrderItems';
import PaymentSummary from '../components/order/PaymentSummary';
import type { OrderData } from '../api';

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then(data => { setOrder(data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '120px 24px', textAlign: 'center', minHeight: '80vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--outline-variant)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound || !order) {
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

        <OrderDetails paymentIntentId={order.paymentIntentId} status={order.status} email={order.email} />

        <div style={{ backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', marginBottom: '32px' }}>
          <h2 className="headline-md" style={{ marginBottom: '24px' }}>Shipping To</h2>
          <div className="body-md">
            <p>{order.firstName} {order.lastName}</p>
            <p>{order.address}</p>
            <p>{order.city}, {order.state} {order.zip}</p>
          </div>
        </div>

        <OrderItems items={order.items} />
        <PaymentSummary subtotal={order.subtotal} shipping={order.shipping} tax={order.tax} total={order.total} />

        <div style={{ textAlign: 'center' }}>
          <Link to="/gallery" className="add-to-cart" style={{ width: 'auto', padding: '12px 32px', display: 'inline-block' }}>Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
