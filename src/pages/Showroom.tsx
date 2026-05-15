import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function Showroom() {
  const navigate = useNavigate();
  const isStaged = new URLSearchParams(window.location.search).get('mode') === 'staging';
  const { adminPassword, isAuthenticated: isAdmin } = useAdminAuth();
  const isEditMode = isAdmin && isStaged;

  const showroomData = useQuery(api.showroom.get, {});
  const inventoryData = useQuery(api.inventory.get as any, {});
  const saveShowroom = useMutation(api.showroom.save);

  const inventory: any[] = inventoryData || [];
  const [slideIndex, setSlideIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides: any[] = showroomData?.slides || [];
  const featured: any[] = showroomData?.featured || [];

  // Fallback: random products from inventory if nothing configured
  const resolvedFeatured = (() => {
    if (featured.length > 0) return featured;
    if (!inventory.length) return [];
    const unique = [...new Map(inventory.map((i: any) => [(i.productName ?? i.cribName), i])).values()];
    const shuffled = [...unique].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8).map((i: any) => ({ productName: i.productName ?? i.cribName, cribName: i.cribName, stainName: undefined }));
  })();

  useEffect(() => {
    if (slides.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setSlideIndex(i => (i + 1) % slides.length);
    }, 5000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setSlideIndex(index);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    intervalRef.current = setInterval(() => {
      setSlideIndex(i => (i + 1) % slides.length);
    }, 5000);
  };

  const goToPrev = () => goToSlide((slideIndex - 1 + slides.length) % slides.length);
  const goToNext = () => goToSlide((slideIndex + 1) % slides.length);

  const saveAll = async (overrides: {
    slides?: any[];
    featured?: any[];
  }) => {
    try {
      await saveShowroom({
        password: adminPassword!,
        ...overrides,
      });
    } catch (err: any) {
      console.error('saveAll error', err);
    }
  };

  const addSlide = async () => {
    const image = prompt("Enter desktop image URL for the slide:");
    if (!image) return;
    const imageMobile = prompt("Enter mobile image URL (or leave blank for same):") || undefined;
    const productId = prompt("Enter product ID to link (or leave blank):") || undefined;
    await saveAll({ slides: [...slides, { image, imageMobile, productId }] });
  };

  const removeSlide = async (index: number) => {
    await saveAll({ slides: slides.filter((_: any, i: number) => i !== index) });
  };

  const editSlide = async (index: number) => {
    const slide = slides[index];
    const image = prompt("Enter new desktop image URL:", slide.image);
    if (!image) return;
    const imageMobile = prompt("Enter new mobile image URL (or leave blank):", slide.imageMobile || '') || undefined;
    const productId = prompt("Enter product ID to link (or leave blank):", slide.productId || '') || undefined;
    const newSlides = [...slides];
    newSlides[index] = { image, imageMobile, productId };
    await saveAll({ slides: newSlides });
  };

  const moveSlide = async (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const newSlides = [...slides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    await saveAll({ slides: newSlides });
  };

  const addFeatured = async () => {
    const productName = prompt("Enter product name (e.g. Mission Crib):");
    if (!productName) return;
    const stainName = prompt("Enter stain name to show (default: Natural):") || undefined;
    await saveAll({ featured: [{ productName, cribName: productName, stainName }] });
  };

  const removeFeatured = async (index: number) => {
    await saveAll({ featured: featured.filter((_: any, i: number) => i !== index) });
  };

  const editFeatured = async (index: number) => {
    const item = featured[index];
    const productName = prompt("Enter product name:", item.productName ?? item.cribName);
    if (!productName) return;
    const stainName = prompt("Enter stain name (or blank for default):", item.stainName || '') || undefined;
    const newFeatured = [...featured];
    newFeatured[index] = { productName, cribName: productName, stainName };
    await saveAll({ featured: newFeatured });
  };

  const moveFeatured = async (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= featured.length) return;
    const newFeatured = [...featured];
    [newFeatured[index], newFeatured[newIndex]] = [newFeatured[newIndex], newFeatured[index]];
    await saveAll({ featured: newFeatured });
  };

  const getFeaturedProduct = (item: any) => {
    const pName = item.productName ?? item.cribName;
    const configs = inventory.filter((i: any) => (i.productName ?? i.cribName) === pName);
    if (configs.length === 0) return null;
    const config = configs[0];
    const stainName = item.stainName || 'Natural';
    const stain = config.stains.find((s: any) => s.name === stainName && s.inStock) || config.stains.find((s: any) => s.inStock);
    if (!stain) {
      return { ...config, stain: null, displayImage: config.stains[0]?.image || null, displayPrice: config.basePrice, displayStainName: '' };
    }
    const displayImage = stain.gallery?.[0]?.url || stain.image || null;
    return {
      ...config,
      stain,
      displayImage,
      displayPrice: config.basePrice + (stain.priceAddition || 0),
      displayStainName: stain.name,
    };
  };

  return (
    <div>
      {slides.length > 0 && (
        <section className="showroom-slideshow">
          {slides.map((slide: any, i: number) => (
            <div
              key={i}
              className={`showroom-slide ${i === slideIndex ? 'active' : ''}`}
              onClick={() => {
                if (!isEditMode && slide.productId) {
                  navigate(`/product/${encodeURIComponent(slide.productId)}`);
                }
              }}
            >
              <picture>
                {slide.imageMobile && <source media="(max-width: 767px)" srcSet={slide.imageMobile} />}
                <img src={slide.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </picture>
              <div className="showroom-slide-overlay" />
              {slide.productId && (
                <div className="showroom-slide-info">
                  <p className="label-caps">FEATURED COLLECTION</p>
                  <h2>{slide.productId}</h2>
                  <p>Click to explore this handcrafted piece</p>
                </div>
              )}
              {isEditMode && (
                <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 30 }}>
                  <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); editSlide(i); }}>Edit</button>
                  {i > 0 && <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); moveSlide(i, -1); }}>Up</button>}
                  {i < slides.length - 1 && <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); moveSlide(i, 1); }}>Down</button>}
                  <button className="admin-edit-btn danger" onClick={(e) => { e.stopPropagation(); removeSlide(i); }}>Delete</button>
                </div>
              )}
            </div>
          ))}

          {slides.length > 1 && (
            <>
              <button className="showroom-slideshow-arrow prev" onClick={goToPrev}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="showroom-slideshow-arrow next" onClick={goToNext}>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
              <div className="showroom-slideshow-dots">
                {slides.map((_: any, i: number) => (
                  <button key={i} className={i === slideIndex ? 'active' : ''} onClick={() => goToSlide(i)} />
                ))}
              </div>
            </>
          )}

          {isEditMode && (
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 30 }}>
              <button className="admin-edit-btn" onClick={addSlide}>+ Add Slide</button>
            </div>
          )}
        </section>
      )}

      {(resolvedFeatured.length > 0 || isEditMode) && (
        <section className="featured-section" style={{ paddingTop: slides.length > 0 ? '48px' : '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="label-caps text-secondary">Curated Collection</span>
            <h2 className="headline-xl text-primary" style={{ marginTop: '8px' }}>Featured Cribs</h2>
          </div>

          {resolvedFeatured.length > 0 && (
            <div className="featured-grid">
              {resolvedFeatured.map((item: any, i: number) => {
                const product = getFeaturedProduct(item);
                const notFound = !product;
                const isFallback = featured.length === 0;

                return (
                  <div
                    key={i}
                    className="featured-card"
                    onClick={() => {
                      if (isEditMode) return;
                      if (!product) return;
                      const params = new URLSearchParams();
                      if (product.displayStainName) params.set('stain', product.displayStainName);
                      navigate(`/product/${encodeURIComponent(item.productName ?? item.cribName)}?${params.toString()}`);
                    }}
                    style={{ position: 'relative', ...(notFound ? { border: '2px dashed var(--error)', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}) }}
                  >
                    {notFound ? (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p style={{ color: 'var(--error)', marginBottom: '12px' }}>"{item.productName ?? item.cribName}" not found</p>
                        {isEditMode && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {!isFallback && <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); editFeatured(i); }}>Edit</button>}
                            {!isFallback && <button className="admin-edit-btn danger" onClick={(e) => { e.stopPropagation(); removeFeatured(i); }}>Remove</button>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="featured-card-img">
                          {product.displayImage ? (
                            <img src={product.displayImage} alt={item.productName ?? item.cribName} />
                          ) : (
                            <div style={{ color: 'var(--outline-variant)', fontSize: '14px' }}>No Image</div>
                          )}
                        </div>
                        <div className="featured-card-body">
                          <h3>{item.productName ?? item.cribName}</h3>
                          <p className="price">${product.displayPrice.toLocaleString()}</p>
                        </div>
                        {isEditMode && !isFallback && (
                          <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', zIndex: 10 }}>
                            <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); editFeatured(i); }}>Edit</button>
                            {i > 0 && <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); moveFeatured(i, -1); }}>Up</button>}
                            {i < featured.length - 1 && <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); moveFeatured(i, 1); }}>Dn</button>}
                            <button className="admin-edit-btn danger" onClick={(e) => { e.stopPropagation(); removeFeatured(i); }}>Del</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {featured.length === 0 && isEditMode && (
            <div style={{ textAlign: 'center' }}>
              <p className="body-md text-on-surface-variant" style={{ marginBottom: '16px' }}>No featured products set. Showing random products. Configure featured items in the admin panel.</p>
            </div>
          )}

          {isEditMode && (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button className="admin-edit-btn" onClick={addFeatured}>+ Add Featured</button>
            </div>
          )}
        </section>
      )}

      <section className="container" style={{ padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="label-caps text-secondary">A Handcrafted Experience</span>
          <h2 className="headline-xl text-primary" style={{ marginTop: '8px' }}>Your Heirloom's Journey</h2>
        </div>

        <div className="journey-timeline">
          <div className="journey-step">
            <div className="journey-step-icon">
              <span className="material-symbols-outlined">forest</span>
            </div>
            <div className="journey-step-content">
              <div className="journey-step-header">
                <span className="journey-step-number">01</span>
                <h3>Wood Selection</h3>
              </div>
              <p>Your 24-hour cancellation period isn't just paperwork. It's when we hand-select the perfect wood for your crib. Brown Maple, Cherry, or Red Oak, chosen grain by your family.</p>
            </div>
          </div>

          <div className="journey-step">
            <div className="journey-step-icon">
              <span className="material-symbols-outlined">handyman</span>
            </div>
            <div className="journey-step-content">
              <div className="journey-step-header">
                <span className="journey-step-number">02</span>
                <h3>The Build</h3>
              </div>
              <p>Once the deposit processes and your order is confirmed, the building begins. Every dovetail and mortise-and-tenon joint is cut by hand—built.</p>
            </div>
          </div>

          <div className="journey-step">
            <div className="journey-step-icon">
              <span className="material-symbols-outlined">palette</span>
            </div>
            <div className="journey-step-content">
              <div className="journey-step-header">
                <span className="journey-step-number">03</span>
                <h3>Expert Staining</h3>
              </div>
              <p>When the build is complete, your crib moves to our master stainer. The finish you chose is applied by hand using organic, child-safe oils. The remaining 50% is then processed.</p>
            </div>
          </div>

          <div className="journey-step">
            <div className="journey-step-icon">
              <span className="material-symbols-outlined">local_shipping</span>
            </div>
            <div className="journey-step-content">
              <div className="journey-step-header">
                <span className="journey-step-number">04</span>
                <h3>White-Glove Delivery</h3>
              </div>
              <p>Shipped directly to your door. Our carrier will contact you to schedule a delivery date that works for you. On delivery day, our team arrives, carries it up to 3 flights of stairs, and assembles it in your nursery.</p>
            </div>
          </div>
        </div>
      </section>

      {isEditMode && (
        <div className="admin-edit-bar">
          <span>Editing Showroom</span>
          <button className="admin-edit-btn" onClick={() => navigate('/admin')}>Open Admin Panel</button>
        </div>
      )}
    </div>
  );
}
