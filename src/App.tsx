import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Gallery from './pages/Gallery';
import ProductDetails from './pages/ProductDetails';
import Showroom from './pages/Showroom';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';

function App() {
  const isStaged = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'staging';

  return (
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
      <main style={{ paddingTop: isStaged ? '40px' : '0' }}>
        <Routes>
          <Route path="/" element={<Showroom />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      
      <footer style={{ backgroundColor: 'var(--surface-container-low)', marginTop: '96px', borderTop: '1px solid var(--outline-variant)', padding: '64px 24px' }}>
         <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
            <div>
               <span className="brand-title" style={{ fontSize: '18px', display: 'block', marginBottom: '16px' }}>Heirloom Cribs</span>
               <p className="body-md text-on-surface-variant">Handcrafted for generations. We believe in the tactile beauty of natural materials and the quiet confidence of master woodworking.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <a href="#" className="body-md text-on-surface-variant" style={{ textDecoration: 'none' }}>Heritage Story</a>
                  <a href="#" className="body-md text-on-surface-variant" style={{ textDecoration: 'none' }}>Craftsmanship</a>
                  <a href="#" className="body-md text-on-surface-variant" style={{ textDecoration: 'none' }}>Sustainability</a>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <a href="#" className="body-md text-on-surface-variant" style={{ textDecoration: 'none' }}>Care Guide</a>
                  <a href="#" className="body-md text-on-surface-variant" style={{ textDecoration: 'none' }}>Privacy Policy</a>
               </div>
            </div>
            <div style={{ textAlign: 'right' }}>
               <p className="body-md text-on-surface-variant" style={{ marginBottom: '16px' }}>© 2026 Heirloom Cribs. Handcrafted for generations.</p>
            </div>
         </div>
      </footer>
    </Router>
  );
}

export default App;
