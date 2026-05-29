import { useState, useEffect } from 'react';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Link, useNavigate } from 'react-router-dom';
import { useAction, useMutation } from "convex/react";
import { useCart } from '../context/CartContext';
import { api } from "../../convex/_generated/api";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

function StripeCheckoutForm({ onSuccess }: { onSuccess: (paymentIntentId: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      alert(error.message);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <PaymentElement />
      <button 
        type="submit" 
        className="add-to-cart" 
        disabled={isProcessing || !stripe || !elements} 
        style={{ width: '100%', marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '8px' }}
      >
        <span>{isProcessing ? "PROCESSING..." : "PAY SECURELY WITH STRIPE"}</span>
        {!isProcessing && <span className="material-symbols-outlined">lock</span>}
      </button>
    </form>
  );
}

export default function Checkout() {
  const { cart, subtotal: cartSubtotal, clearCart, removeFromCart } = useCart();
  const navigate = useNavigate();

  const paymentProvider = 'stripe';
  
  const [clientSecret, setClientSecret] = useState('');
  const [clientSecretError, setClientSecretError] = useState('');
  const [isLoadingSecret, setIsLoadingSecret] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  
  const createPaymentIntent = useAction(api.stripe.createPaymentIntent);
  const saveOrder = useMutation(api.orders.save);
  
  const shipping = cart.length > 0 ? 150 : 0;
  const tax = Math.round(cartSubtotal * 0.08);
  const finalTotal = cartSubtotal + shipping + tax;

  useEffect(() => {
    if (paymentProvider === 'stripe' && finalTotal > 0) {
      setClientSecret('');
      setClientSecretError('');
      setIsLoadingSecret(true);
      createPaymentIntent({ amount: finalTotal * 100, currency: 'usd' })
      .then(data => {
        setClientSecret(data.clientSecret || '');
        setIsLoadingSecret(false);
      })
      .catch(err => {
        console.error(err);
        setClientSecretError('Failed to initialize payment. Please try again or contact support.');
        setIsLoadingSecret(false);
      });
    }
  }, [paymentProvider, finalTotal]);

  if (cart.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <h2 className="headline-lg">Your cart is empty</h2>
        <p className="body-lg" style={{ marginTop: '16px', marginBottom: '32px' }}>Start exploring our handcrafted collection to build your legacy.</p>
        <Link to="/gallery" className="add-to-cart" style={{ width: 'auto', padding: '12px 32px' }}>Browse Gallery</Link>
      </div>
    );
  }

  const handleSuccess = async (paymentIntentId: string) => {
    try {
      const orderId = await saveOrder({
        email,
        firstName,
        lastName,
        address,
        city,
        state,
        zip,
        items: cart.map(item => ({
          productName: item.productName,
          cribName: item.cribName,
          wood: item.wood,
          stainName: item.stainName,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          addons: item.addons,
        })),
        subtotal: cartSubtotal,
        shipping,
        tax,
        total: finalTotal,
        paymentIntentId,
        status: 'confirmed',
      });
      clearCart();
      navigate(`/order-confirmation/${orderId}`);
    } catch (err) {
      console.error("Failed to save order", err);
      alert("Payment succeeded but we couldn't save your order. Please contact support.");
    }
  };

  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div className="grid-layout">
        <div className="product-showcase" style={{ flex: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
             <span className="label-caps text-on-surface-variant">SECURE CHECKOUT</span>
             <span className="material-symbols-outlined text-secondary" style={{ fontSize: '18px' }}>lock</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <section>
               <h2 className="headline-md" style={{ marginBottom: '24px' }}>Contact Information</h2>
               <div>
                  <label htmlFor="email" className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>EMAIL ADDRESS <span className="text-red-500">*</span></label>
                   <input id="email" type="email" required placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
               </div>
            </section>

            <section>
               <h2 className="headline-md" style={{ marginBottom: '24px' }}>Shipping Destination</h2>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                 <div>
                    <label htmlFor="firstName" className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>FIRST NAME <span className="text-red-500">*</span></label>
                     <input id="firstName" type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                  </div>
                  <div>
                     <label htmlFor="lastName" className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>LAST NAME <span className="text-red-500">*</span></label>
                     <input id="lastName" type="text" required value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                 </div>
                 <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="address" className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>ADDRESS <span className="text-red-500">*</span></label>
                     <input id="address" type="text" required placeholder="123 Heritage Lane" value={address} onChange={e => setAddress(e.target.value)} style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                 </div>
                 <div>
                    <label htmlFor="city" className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>CITY <span className="text-red-500">*</span></label>
                     <input id="city" type="text" required value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                     <div>
                         <label htmlFor="state" className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>STATE <span className="text-red-500">*</span></label>
                         <input id="state" type="text" required value={state} onChange={e => setState(e.target.value)} style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                     </div>
                     <div>
                         <label htmlFor="zip" className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>ZIP CODE <span className="text-red-500">*</span></label>
                         <input id="zip" type="text" required value={zip} onChange={e => setZip(e.target.value)} style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                    </div>
                 </div>
               </div>
            </section>

            <section style={{ padding: '32px', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', boxShadow: 'var(--shadow-ambient)', border: '1px solid var(--surface-container-highest)' }}>
               <h2 className="headline-md" style={{ marginBottom: '24px' }}>Terms & Conditions</h2>
               <div style={{ 
                 backgroundColor: 'var(--surface-container-highest)', 
                 padding: '24px', 
                 borderRadius: '12px', 
                 marginBottom: '24px',
                 maxHeight: '200px',
                 overflowY: 'auto',
                 fontSize: '13px',
                 lineHeight: '1.6',
                 color: 'var(--on-surface-variant)',
                 border: '1px solid var(--outline-variant)'
               }}>
                 <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>1. Refund & Cancellation Policy</p>
                 <p style={{ marginBottom: '16px' }}>Buyer may cancel for a full refund (less any credit-card fees) within 48 hours of the order date by written notice only. After 48 hours, the order is committed and non-cancellable. Any later cancellation results in full forfeiture of the 50% deposit as reasonable liquidated damages (13 Pa.C.S. § 2718).</p>
                 
                 <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>2. All Sales Final / No Returns</p>
                 <p style={{ marginBottom: '16px' }}>Custom orders are built to Buyer’s exact specifications. No cancellations, modifications, returns, exchanges, or refunds after the 48-hour period. (13 Pa.C.S. Article 2 and UTPCPL).</p>
                 
                 <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>3. Deposit Requirement</p>
                 <p style={{ marginBottom: '16px' }}>A minimum 50% non-refundable deposit of the total order price is required to place any custom order. Production begins immediately. Balance due before delivery.</p>
                 
                 <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>4. Delivery Terms</p>
                 <p style={{ marginBottom: '16px' }}>Delivery date is estimated only. Seller is not liable for delays beyond control. Risk of loss passes to Buyer upon delivery.</p>
                 
                 <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>5. Inspection and Acceptance</p>
                 <p style={{ marginBottom: '16px' }}>Buyer must inspect goods immediately upon delivery. Signing the delivery receipt constitutes acceptance as conforming unless visible damage is expressly noted. Concealed defects must be reported within 5 business days.</p>
                 
                 <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>6. Limited Warranty</p>
                 <p>Seller makes no independent warranties. Buyer receives solely any manufacturer’s warranty. Seller expressly disclaims all express and implied warranties to the fullest extent permitted by Pennsylvania law.</p>
               </div>

               <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', cursor: 'pointer', padding: '16px', backgroundColor: agreedToTerms ? 'var(--primary-container)' : 'transparent', borderRadius: '8px', border: '1px solid var(--outline-variant)', transition: 'all 0.2s' }}>
                 <input 
                   type="checkbox" 
                   checked={agreedToTerms} 
                   onChange={e => setAgreedToTerms(e.target.checked)}
                   style={{ width: '20px', height: '20px' }}
                 />
                 <span className="label-large" style={{ color: agreedToTerms ? 'var(--on-primary-container)' : 'var(--on-surface)' }}>
                   I have read and agree to the Refund and Cancellation Policy
                 </span>
               </label>

               <h2 className="headline-md" style={{ marginBottom: '24px', opacity: agreedToTerms ? 1 : 0.5 }}>Payment Method</h2>

                {isLoadingSecret && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px', justifyContent: 'center' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid var(--outline-variant)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span className="body-md text-on-surface-variant">Preparing payment...</span>
                  </div>
                )}

                {clientSecretError && (
                  <div style={{ padding: '24px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '16px' }}>
                    <p className="body-md" style={{ color: '#991b1b' }}>{clientSecretError}</p>
                  </div>
                )}

                {!agreedToTerms && !isLoadingSecret && !clientSecretError && (
                  <p className="body-sm text-secondary" style={{ marginBottom: '16px' }}>Please agree to the terms above to enable payment.</p>
                )}

                {paymentProvider === 'stripe' && clientSecret && (
                  <div style={{ opacity: agreedToTerms ? 1 : 0.5, pointerEvents: agreedToTerms ? 'auto' : 'none' }}>
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat' } }}>
                       <StripeCheckoutForm onSuccess={handleSuccess} />
                    </Elements>
                  </div>
                )}
            </section>
          </div>

          <div className="checkout-trust" style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--surface-container-highest)' }}>
             <div style={{ display: 'flex', gap: '16px' }}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '32px' }}>verified</span>
                <div>
                   <p className="label-caps text-primary" style={{ marginBottom: '4px' }}>HANDCRAFTED GUARANTEE</p>
                   <p className="body-md text-on-surface-variant" style={{ fontSize: '12px' }}>Each piece is inspected by a master woodworker before shipping.</p>
                </div>
             </div>
             <div style={{ display: 'flex', gap: '16px' }}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '32px' }}>local_shipping</span>
                <div>
                   <p className="label-caps text-primary" style={{ marginBottom: '4px' }}>WHITE GLOVE DELIVERY</p>
                   <p className="body-md text-on-surface-variant" style={{ fontSize: '12px' }}>Professional in-home assembly and packaging removal included.</p>
                </div>
             </div>
          </div>
        </div>

        <div className="configuration-panel" style={{ flex: 5 }}>
          <div style={{ position: 'sticky', top: '100px', backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', boxShadow: 'var(--shadow-ambient)' }}>
             <h2 className="headline-md" style={{ marginBottom: '32px' }}>Order Summary</h2>
             
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                 {cart.map((item) => (
                   <div key={item.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'white' }}>
                         <img style={{ width: '100%', height: '100%', objectFit: 'contain' }} src={item.image} alt={item.cribName} />
                      </div>
                      <div style={{ flexGrow: 1 }}>
                         <h3 className="body-lg" style={{ fontWeight: 'bold', marginBottom: '2px' }}>{item.cribName}</h3>
                         <p className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>
                           {item.wood.replace(/([A-Z])/g, ' $1').trim()} • {item.stainName}
                         </p>
                          <p className="body-md" style={{ marginTop: '4px' }}>${item.price.toLocaleString()}.00 x {item.quantity}</p>
                          {item.addons && item.addons.length > 0 && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {item.addons.map((addon, ai) => (
                                <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                  <span>{addon.name}{addon.stainName ? ` (${addon.stainName})` : ''}</span>
                                  <span>+${addon.price.toLocaleString()}.00</span>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>
                       <button
                        onClick={() => removeFromCart(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--on-surface-variant)', fontSize: '18px', lineHeight: 1 }}
                        aria-label={`Remove ${item.cribName} from cart`}
                        title="Remove item"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">close</span>
                      </button>
                   </div>
                 ))}
             </div>

             <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
                   <span>Subtotal</span>
                   <span>${cartSubtotal.toLocaleString()}.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
                   <span>Shipping</span>
                   <span>${shipping.toLocaleString()}.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
                   <span>Estimated Tax</span>
                   <span>${tax.toLocaleString()}.00</span>
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
