import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Gallery from './pages/Gallery';
import ProductDetails from './pages/ProductDetails';
import Showroom from './pages/Showroom';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';

import { CartProvider } from './context/CartContext';

function App() {
  const isStaged = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'staging';

  return (
    <CartProvider>
      <Router>
      {isStaged && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          backgroundColor: '#322214', 
          color: '#fff', 
          textAlign: 'center', 
          padding: '10px', 
          zIndex: 1000,
          fontSize: '12px',
          fontWeight: '700',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          Preview Mode: Editing Staging Environment
        </div>
      )}
      <Header />
      <main style={{ paddingTop: isStaged ? '120px' : '80px' }}>
        <Routes>
          <Route path="/" element={<Showroom />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      
      <footer style={{ backgroundColor: 'var(--surface-container-low)', marginTop: '96px', borderTop: '1px solid var(--outline-variant)', padding: '64px 24px' }}>
         <div className="container">
            <div style={{ 
               backgroundColor: 'var(--surface-container)', 
               padding: '48px', 
               borderRadius: '16px', 
               marginBottom: '64px',
               textAlign: 'center',
               border: '1px solid var(--outline-variant)'
            }}>
               <h2 className="headline-md" style={{ marginBottom: '8px' }}>Join Our Community</h2>
               <p className="body-md text-on-surface-variant" style={{ marginBottom: '32px' }}>Subscribe for exclusive offers and design inspiration.</p>
               <form style={{ display: 'flex', gap: '12px', justifyContent: 'center', maxWidth: '500px', margin: '0 auto' }} onSubmit={e => e.preventDefault()}>
                  <input 
                     type="email" 
                     placeholder="Enter your email" 
                     style={{ flex: 1, padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)' }}
                  />
                  <button className="add-to-cart" style={{ width: 'auto', padding: '12px 32px' }}>Subscribe</button>
               </form>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
               <div>
                  <span className="brand-title" style={{ fontSize: '24px', display: 'block', marginBottom: '16px' }}>Heirloom Cribs</span>
                  <p className="body-md text-on-surface-variant" style={{ maxWidth: '400px' }}>Handcrafted for generations. We believe in the tactile beauty of natural materials and the quiet confidence of master woodworking.</p>
               </div>
               <div style={{ textAlign: 'right' }}>
                  <h3 className="label-caps text-primary" style={{ marginBottom: '16px' }}>Contact Our Master Craftsmen</h3>
                  <p className="body-lg" style={{ marginBottom: '8px' }}>support@heirloomcribs.com</p>
                  <p className="body-md text-on-surface-variant">Available Mon-Fri, 9am - 5pm EST</p>
                  <p className="body-md text-on-surface-variant" style={{ marginTop: '24px' }}>© 2026 Heirloom Cribs. All Rights Reserved.</p>
               </div>
            </div>
         </div>
      </footer>
      </Router>
    </CartProvider>
  );
}

export default App;
