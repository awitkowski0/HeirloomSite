import { useRef, useState, useEffect, useCallback } from 'react';
import type { Stain } from '../../types';

interface Props {
  stains: Stain[];
  productName: string;
  basePrice: number;
  initialStain: string;
  onSelectStain: (name: string) => void;
  onAddToCart: (stain: Stain) => void;
  onClose: () => void;
}

interface WindowWithBabylist extends Window {
  bl?: { addToRegistry: (d: Record<string, string>) => void };
}

export default function StainReel({
  stains,
  productName,
  basePrice,
  initialStain,
  onSelectStain,
  onAddToCart,
  onClose,
}: Props) {
  const reelStains = stains.filter(s => s.inStock);
  const startIndex = Math.max(0, reelStains.findIndex(s => s.name === initialStain));
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [toast, setToast] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const priceFor = (s: Stain) => basePrice + (s.priceAddition || 0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  // Jump to the initially selected finish, lock the page behind the reel,
  // and close on Escape.
  useEffect(() => {
    cardRefs.current[startIndex]?.scrollIntoView({ block: 'start' });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // startIndex/onClose are stable for the life of the reel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the finish currently filling the viewport and sync it to the page.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
            onSelectStain(reelStains[idx].name);
          }
        }
      },
      { root, threshold: 0.6 },
    );
    cardRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelStains.length]);

  const handleShare = async (stain: Stain) => {
    const url = window.location.href;
    const title = `${productName} — ${stain.name} finish`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast('Link copied');
      }
    } catch {
      /* user dismissed the share sheet — nothing to do */
    }
  };

  const handleBabylist = (stain: Stain) => {
    const bl = (window as WindowWithBabylist).bl;
    if (bl?.addToRegistry) {
      bl.addToRegistry({
        images: stain.image || '',
        price: String(priceFor(stain)),
        title: `${productName} (${stain.name})`,
        url: window.location.href,
      });
      showToast('Added to Babylist');
    } else {
      showToast('Babylist is unavailable right now');
    }
  };

  if (reelStains.length === 0) return null;

  return (
    <div className="stain-reel" role="dialog" aria-modal="true" aria-label="Browse finishes">
      <div className="stain-reel-topbar">
        <span className="stain-reel-count" aria-hidden="true">{activeIndex + 1} / {reelStains.length}</span>
        <button className="stain-reel-close" onClick={onClose} aria-label="Close finish browser">
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="stain-reel-scroll" ref={scrollRef}>
        {reelStains.map((stain, i) => (
          <section
            key={stain.name}
            className="stain-reel-card"
            data-index={i}
            ref={el => { cardRefs.current[i] = el; }}
            aria-label={`${stain.name} finish`}
          >
            <div className="stain-reel-media">
              {stain.image ? (
                <img src={stain.image} alt={`${productName} in ${stain.name}`} draggable={false} />
              ) : (
                <div className="stain-reel-noimg">No preview</div>
              )}
              {reelStains.length > 1 && activeIndex === 0 && i === 0 && (
                <div className="stain-reel-hint" aria-hidden="true">
                  <span className="material-symbols-outlined">keyboard_arrow_up</span>
                  Swipe for more finishes
                </div>
              )}
            </div>

            <div className="stain-reel-panel">
              <p className="label-caps stain-reel-eyebrow">Finish {i + 1} of {reelStains.length}</p>
              <h2 className="stain-reel-name">{stain.name}</h2>
              <p className="stain-reel-price">${priceFor(stain).toLocaleString()}</p>
              <div className="stain-reel-panel-actions">
                <button className="stain-reel-add-btn" onClick={() => onAddToCart(stain)}>
                  <span className="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span>
                  Add to Cart
                </button>
                <button className="stain-reel-icon-btn" onClick={() => handleShare(stain)} aria-label="Share this finish">
                  <span className="material-symbols-outlined" aria-hidden="true">ios_share</span>
                </button>
                <button className="stain-reel-icon-btn" onClick={() => handleBabylist(stain)} aria-label="Add to Babylist">
                  <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      {toast && <div className="stain-reel-toast" role="status">{toast}</div>}
    </div>
  );
}
