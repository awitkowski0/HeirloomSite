import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InventoryItem, ShowroomSlide } from '../../types';

interface Props {
  slides: ShowroomSlide[];
  inventory: InventoryItem[];
}

export default function ShowroomSlideshow({ slides, inventory }: Props) {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  if (slides.length === 0) return null;

  return (
    <section className="showroom-slideshow">
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`showroom-slide ${i === slideIndex ? 'active' : ''}`}
          onClick={() => {
            if (slide.productId) {
              const invItem = inventory.find(i => i.productName === slide.productId);
              navigate(`/product/${invItem?.slug || encodeURIComponent(slide.productId)}`);
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
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button className="showroom-slideshow-arrow prev" onClick={() => goToSlide((slideIndex - 1 + slides.length) % slides.length)}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="showroom-slideshow-arrow next" onClick={() => goToSlide((slideIndex + 1) % slides.length)}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <div className="showroom-slideshow-dots">
            {slides.map((_, i) => (
              <button key={i} className={i === slideIndex ? 'active' : ''} onClick={() => goToSlide(i)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
