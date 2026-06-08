import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/useCart';
import { createPaymentIntent } from '../api';
import ContactForm from '../components/checkout/ContactForm';
import ShippingForm from '../components/checkout/ShippingForm';
import PaymentSection from '../components/checkout/PaymentSection';

export default function Checkout() {
  const { cart, subtotal: cartSubtotal, clearCart, removeFromCart } = useCart();
  const navigate = useNavigate();

  const [clientSecret, setClientSecret] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  const shipping = cart.length > 0 ? 150 : 0;
  const tax = Math.round(cartSubtotal * 0.08);
  const finalTotal = cartSubtotal + shipping + tax;
  const isLoading = !clientSecret && !error && finalTotal > 0;

  useEffect(() => {
    if (clientSecret || error || finalTotal <= 0) return;
    createPaymentIntent({
        cart: cart.map(item => ({
          productName: item.productName,
          wood: item.wood,
          stainName: item.stainName,
          image: item.image,
          quantity: item.quantity,
          addons: item.addons,
        })),
        email, firstName, lastName, address, city, state, zip,
      })
      .then(data => {
        setClientSecret(data.clientSecret);
        setToken(data.token);
      })
      .catch(() => {
        setError('Failed to initialize payment. Please try again or contact support.');
      });
  }, [clientSecret, error, finalTotal, cart, email, firstName, lastName, address, city, state, zip]);

  if (cart.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <h2 className="headline-lg">Your cart is empty</h2>
        <p className="body-lg" style={{ marginTop: '16px', marginBottom: '32px' }}>Start exploring our handcrafted collection to build your legacy.</p>
        <Link to="/gallery" className="add-to-cart" style={{ width: 'auto', padding: '12px 32px' }}>Browse Gallery</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div className="grid-layout">
        <div className="product-showcase" style={{ flex: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
            <span className="label-caps text-on-surface-variant">SECURE CHECKOUT</span>
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '18px' }}>lock</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <ContactForm email={email} onChange={setEmail} />
            <ShippingForm
              firstName={firstName} lastName={lastName} address={address}
              city={city} state={state} zip={zip}
              onChange={(field, value) => {
                const setters: Record<string, (v: string) => void> = {
                  firstName: setFirstName, lastName: setLastName, address: setAddress,
                  city: setCity, state: setState, zip: setZip,
                };
                setters[field]?.(value);
              }}
            />

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px', justifyContent: 'center' }}>
                <div style={{ width: '20px', height: '20px', border: '2px solid var(--outline-variant)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span className="body-md text-on-surface-variant">Preparing payment...</span>
              </div>
            )}

            {error && (
              <div style={{ padding: '24px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <p className="body-md" style={{ color: '#991b1b' }}>{error}</p>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '16px', backgroundColor: agreedToTerms ? 'var(--primary-container)' : 'transparent', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ width: '20px', height: '20px' }} />
              <span className="label-large" style={{ color: agreedToTerms ? 'var(--on-primary-container)' : 'var(--on-surface)' }}>
                I have read and agree to the Refund and Cancellation Policy
              </span>
            </label>

            {clientSecret && (
              <PaymentSection clientSecret={clientSecret} agreedToTerms={agreedToTerms} onSuccess={(piId) => { clearCart(); navigate(`/order-confirmation/${piId}?token=${token}`); }} />
            )}
          </div>
        </div>

        <div className="configuration-panel" style={{ flex: 5 }}>
          <div style={{ position: 'sticky', top: '100px', backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', boxShadow: 'var(--shadow-ambient)' }}>
            <h2 className="headline-md" style={{ marginBottom: '32px' }}>Order Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'white' }}>
                    <img style={{ width: '100%', height: '100%', objectFit: 'contain' }} src={item.image} alt={item.productName} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h3 className="body-lg" style={{ fontWeight: 'bold', marginBottom: '2px' }}>{item.productName}</h3>
                    <p className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>
                      {item.wood.replace(/([A-Z])/g, ' $1').trim()} &bull; {item.stainName}
                    </p>
                    <p className="body-md" style={{ marginTop: '4px' }}>${item.price.toLocaleString()}.00 x {item.quantity}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--on-surface-variant)' }}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
                <span>Subtotal</span><span>${cartSubtotal.toLocaleString()}.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
                <span>Shipping</span><span>${shipping.toLocaleString()}.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
                <span>Estimated Tax</span><span>${tax.toLocaleString()}.00</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(50, 34, 20, 0.2)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="headline-md" style={{ fontSize: '20px' }}>Total</span>
                <span className="headline-md text-primary" style={{ fontSize: '24px' }}>${finalTotal.toLocaleString()}.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
