'use client';

import { useEffect, useMemo, useState } from 'react';
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

/*
 * One slim bar on every page except checkout: where you are, a way to reach a
 * person, and five thumbnails that fill as the nursery does. Only the cart fills
 * them, so progress never claims something that was merely saved.
 */
export default function Dock() {
  const pathname = usePathname();
  const { cart, hydrated, subtotal } = useCart();
  const [panel, setPanel] = useState<Panel>(null);
  const [lastPath, setLastPath] = useState(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setPanel(null);
  }

  useEffect(
    () =>
      onPanelRequest(request => {
        setPanel(request.kind === 'tray' ? { kind: 'tray' } : { kind: 'chat', piece: request.piece ?? null });
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

  const lines = useMemo(() => (hydrated ? cart : []), [cart, hydrated]);
  const cartSummary = lines.length > 0 ? lines.map(l => l.productName).join(', ') : null;

  if (pathname?.startsWith('/checkout')) return null;

  const filled = NURSERY_STEPS.filter(s => lines.some(l => stepFor(l.productName) === s.id)).length;
  const here = (href: string) => (pathname === href ? 'page' : undefined);

  return (
    <>
      {panel && (
        <aside
          className="panel"
          aria-label={panel.kind === 'tray' ? 'Your nursery' : 'Talk to someone'}
          onClickCapture={e => {
            if ((e.target as HTMLElement).closest('a[href^="/"]')) setPanel(null);
          }}
        >
          {panel.kind === 'tray' ? (
            <TrayPanel onClose={() => setPanel(null)} />
          ) : (
            <ChatPanel pieceName={panel.piece} cartSummary={cartSummary} onClose={() => setPanel(null)} />
          )}
        </aside>
      )}
      <nav className="dock" aria-label="Shop">
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
