import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Header from './components/Header';
import Gallery from './pages/Gallery';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Showroom from './pages/Showroom';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Contact from './pages/Contact';
import { CartProvider } from './context/CartContext';
import BottomNav from './components/BottomNav';

function AppContent() {
  return (
    <CartProvider>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Showroom />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:category" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
        </Routes>
      </main>

      <BottomNav />

      <footer style={{ backgroundColor: 'var(--surface-container-low)', marginTop: '96px', borderTop: '1px solid var(--outline-variant)', padding: '64px 24px' }}>
         <div className="container">
             <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', alignItems: 'start' }}>
                <div>
                   <span className="brand-title" style={{ fontSize: '24px', display: 'block', marginBottom: '16px' }}>Heirloom Cribs and More</span>
                   <p className="body-md text-on-surface-variant" style={{ maxWidth: '300px' }}>Handcrafted for generations.</p>
                </div>
                <div>
                   <h3 className="label-caps text-primary" style={{ marginBottom: '16px' }}>Shop</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     <Link to="/products" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>All Products</Link>
                     <Link to="/gallery" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Gallery</Link>
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <h3 className="label-caps text-primary" style={{ marginBottom: '16px' }}>Support</h3>
                   <Link to="/contact" style={{ textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
                     <p className="body-lg" style={{ color: 'var(--on-surface-variant)' }}>Contact Us</p>
                   </Link>
                   <p className="body-md text-on-surface-variant" style={{ marginTop: '24px' }}>© 2026 Heirloom Cribs and More. All Rights Reserved.</p>
                </div>
             </div>
         </div>
      </footer>
    </CartProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
