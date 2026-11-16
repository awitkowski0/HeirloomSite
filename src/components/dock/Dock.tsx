'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/useCart';
import { onPanelRequest, requestPanel } from '@/context/selectionsStore';
import { NURSERY_STEPS, stepFor } from '@/lib/cart-lines';
import { formatPriceApprox } from '@/lib/format';
import ChatPanel from './ChatPanel';
import TrayPanel from './TrayPanel';

type Panel = { kind: 'tray' } | { kind: 'chat'; piece: string | null } | null;

const WIDE = '(min-width: 1200px)';

/*
 * One slim bar on every page except checkout: where you are, a way to reach a
 * person, and five thumbnails that fill as the nursery does. Only the cart fills
 * them, so progress never claims something that was merely saved.
 *
 * The cart and the chat are always mounted, as one tree. Under 1200px they are
 * the sheet the bar opens; from 1200px up CSS makes them a fixed rail, cart above
 * chat, that is always open. Checkout's own summary stands in for the cart there.
 */
export default function Dock() {
  const pathname = usePathname();
  const { cart, hydrated, subtotal } = useCart();
  const [panel, setPanel] = useState<Panel>(null);
  const [lastPath, setLastPath] = useState(pathname);
  /* Which panel the sheet shows, kept after it closes so it can slide out full. */
  const [part, setPart] = useState<'tray' | 'chat'>('tray');
  const [piece, setPiece] = useState<string | null>(null);
  const chatBox = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLElement>(null);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setPanel(null);
  }

  useEffect(
    () =>
      onPanelRequest(request => {
        setPanel(request.kind === 'tray' ? { kind: 'tray' } : { kind: 'chat', piece: request.piece ?? null });
        setPart(request.kind === 'tray' ? 'tray' : 'chat');
        if (request.kind === 'chat') {
          setPiece(request.piece ?? null);
          // On a wide screen the chat is already open, so land the caret in it.
          if (window.matchMedia(WIDE).matches) chatBox.current?.querySelector<HTMLInputElement>('.composer input')?.focus();
        }
      }),
    [],
  );

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  /* Lines that were already in the cart don't animate in; only ones added afterwards do. */
  useEffect(() => {
    if (!hydrated) return;
    const id = requestAnimationFrame(() => {
      railRef.current?.setAttribute('data-settled', '');
      dockRef.current?.setAttribute('data-settled', '');
    });
    return () => cancelAnimationFrame(id);
  }, [hydrated]);

  const lines = useMemo(() => (hydrated ? cart : []), [cart, hydrated]);
  const cartSummary = lines.length > 0 ? lines.map(l => l.productName).join(', ') : null;

  const onCheckout = Boolean(pathname?.startsWith('/checkout'));
  const filled = NURSERY_STEPS.filter(s => lines.some(l => stepFor(l.productName) === s.id)).length;
  const here = (href: string) => (pathname === href ? 'page' : undefined);

  return (
    <>
      <aside
        className="rail"
        ref={railRef}
        data-part={part}
        data-open={panel ? '' : undefined}
        data-checkout={onCheckout ? '' : undefined}
        aria-label="Your nursery and chat"
        onClickCapture={e => {
          if ((e.target as HTMLElement).closest('a[href^="/"]')) setPanel(null);
        }}
      >
        {!onCheckout && (
          <div className="rail-part rail-part--cart">
            <TrayPanel onClose={() => setPanel(null)} />
          </div>
        )}
        <div className="rail-part rail-part--chat" ref={chatBox}>
          <ChatPanel pieceName={piece} cartSummary={cartSummary} onClose={() => setPanel(null)} />
        </div>
      </aside>
      <nav className="dock" ref={dockRef} aria-label="Shop" data-checkout={onCheckout ? '' : undefined}>
        <Link href="/" className="dock-link" aria-current={here('/')}>Find</Link>
        <Link href="/products" className="dock-link" aria-current={here('/products')}>Shop</Link>
        <button
          type="button"
          className="dock-link"
          aria-expanded={panel?.kind === 'chat'}
          onClick={() => (panel?.kind === 'chat' ? setPanel(null) : requestPanel({ kind: 'chat' }))}
        >
          Talk
        </button>
        <button
          type="button"
          className="dock-yours"
          aria-expanded={panel?.kind === 'tray'}
          aria-label={`Your nursery, ${filled} of ${NURSERY_STEPS.length} chosen, ${lines.length} in cart`}
          onClick={() => (panel?.kind === 'tray' ? setPanel(null) : requestPanel({ kind: 'tray' }))}
        >
          <span className="dock-slots" aria-hidden="true">
            {NURSERY_STEPS.map(step => {
              const line = lines.filter(l => stepFor(l.productName) === step.id).pop();
              return (
                <span key={step.id} className={line ? 'dock-slot dock-slot--full' : 'dock-slot'}>
                  {line?.image ? <Image src={line.image} alt="" fill sizes="30px" /> : null}
                </span>
              );
            })}
          </span>
          <span className="dock-total">{lines.length > 0 ? formatPriceApprox(subtotal) : 'Cart'}</span>
        </button>
      </nav>
    </>
  );
}
