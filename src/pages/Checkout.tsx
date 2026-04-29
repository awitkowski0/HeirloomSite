import { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useLocation, Navigate } from 'react-router-dom';
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

function StripeCheckoutForm({ onSuccess }: { onSuccess: () => void }) {
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
      onSuccess();
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
  const location = useLocation();
  const checkoutData = location.state;

  const paymentProvider = 'stripe';
  
  const [clientSecret, setClientSecret] = useState('');
  
  const createPaymentIntent = useAction(api.stripe.createPaymentIntent);
  
  const finalTotalCalc = () => {
    if (!checkoutData) return 0;
    const itemTotal = checkoutData.basePrice + checkoutData.addition;
    const tax = Math.round(itemTotal * 0.08);
    return itemTotal + 150 + tax;
  };

  useEffect(() => {
    if (paymentProvider === 'stripe' && checkoutData) {
      createPaymentIntent({ amount: finalTotalCalc() * 100, currency: 'usd' })
      .then(data => setClientSecret(data.clientSecret || ''))
      .catch(console.error);
    }
  }, [paymentProvider, checkoutData]);

  if (!checkoutData) {
    return <Navigate to="/gallery" replace />;
  }

  const { cribName, wood, stainName, basePrice, addition, image } = checkoutData;
  const itemTotal = basePrice + addition;
  const shipping = 150;
  const tax = Math.round(itemTotal * 0.08);
  const finalTotal = itemTotal + shipping + tax;

  const handleSuccess = () => {
    alert("Transaction completed successfully! Your heirloom is being prepared.");
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
                  <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>EMAIL ADDRESS</label>
                  <input type="email" placeholder="email@example.com" style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
               </div>
            </section>

            <section>
               <h2 className="headline-md" style={{ marginBottom: '24px' }}>Shipping Destination</h2>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                 <div>
                    <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>FIRST NAME</label>
                    <input type="text" style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                 </div>
                 <div>
                    <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>LAST NAME</label>
                    <input type="text" style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                 </div>
                 <div style={{ gridColumn: 'span 2' }}>
                    <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>ADDRESS</label>
                    <input type="text" placeholder="123 Heritage Lane" style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                 </div>
                 <div>
                    <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>CITY</label>
                    <input type="text" style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>STATE</label>
                        <input type="text" style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                    </div>
                    <div>
                        <label className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>ZIP CODE</label>
                        <input type="text" style={{ width: '100%', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 16px', outline: 'none' }} />
                    </div>
                 </div>
               </div>
            </section>

            <section style={{ padding: '32px', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', boxShadow: 'var(--shadow-ambient)', border: '1px solid var(--surface-container-highest)' }}>
               <h2 className="headline-md" style={{ marginBottom: '24px' }}>Payment Method</h2>
               
               {!paymentProvider && <p>Loading payment provider...</p>}

               {paymentProvider === 'paypal' && (
                 <PayPalScriptProvider options={{ clientId: "test", currency: "USD", intent: "capture" }}>
                   <PayPalButtons 
                     style={{ layout: "vertical" }} 
                     createOrder={(_data, actions) => {
                       return actions.order.create({
                         intent: "CAPTURE",
                         purchase_units: [
                           {
                             description: `${cribName} - ${wood.replace(/([A-Z])/g, ' $1').trim()} - ${stainName}`,
                             amount: {
                               currency_code: "USD",
                               value: finalTotal.toString(),
                               breakdown: {
                                 item_total: { currency_code: "USD", value: itemTotal.toString() },
                                 shipping: { currency_code: "USD", value: shipping.toString() },
                                 tax_total: { currency_code: "USD", value: tax.toString() }
                               }
                             }
                           },
                         ],
                       });
                     }}
                     onApprove={(_data, actions) => {
                       return actions.order!.capture().then(() => handleSuccess());
                     }}
                   />
                 </PayPalScriptProvider>
               )}

               {paymentProvider === 'stripe' && clientSecret && (
                 <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat' } }}>
                    <StripeCheckoutForm onSuccess={handleSuccess} />
                 </Elements>
               )}
            </section>
          </div>

          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--surface-container-highest)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
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
             <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
                <div style={{ width: '128px', height: '128px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'white' }}>
                   <img style={{ width: '100%', height: '100%', objectFit: 'contain' }} src={image} alt={cribName} />
                </div>
                <div style={{ flexGrow: 1 }}>
                   <h3 className="headline-md" style={{ fontSize: '20px', marginBottom: '4px' }}>{cribName}</h3>
                   <span className="label-caps text-primary" style={{ padding: '4px 8px', backgroundColor: 'var(--surface-container-highest)', borderRadius: '4px', fontSize: '10px' }}>
                     {wood.replace(/([A-Z])/g, ' $1').trim()} • {stainName}
                   </span>
                   <p className="body-md text-on-surface-variant" style={{ marginTop: '16px' }}>Hand-sanded finish</p>
                   <p className="body-md" style={{ marginTop: '8px' }}>${itemTotal.toLocaleString()}.00</p>
                </div>
             </div>

             <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
                   <span>Subtotal</span>
                   <span>${itemTotal.toLocaleString()}.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)' }}>
                   <span>White Glove Shipping</span>
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

             <div style={{ marginTop: '32px', padding: '16px', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '8px', border: '1px dashed var(--outline-variant)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined text-secondary">eco</span>
                <p className="body-md" style={{ fontSize: '12px', color: 'var(--on-secondary-container)', lineHeight: '1.2' }}>Your purchase plants 5 native trees in protected forests. Thank you for choosing sustainability.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
