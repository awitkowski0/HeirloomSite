'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/*
 * How many dialogs are open right now.
 *
 * WHY A MODULE-LEVEL COUNTER AND NOT PER-INSTANCE STATE. Each Modal used to
 * capture body.style.overflow on open and restore that captured value on close.
 * With two dialogs open at once - which the email capture popup made possible,
 * since CartPopup uses this same component - the inner one captures the OUTER
 * one's already-locked 'hidden', and closing the inner one restores 'hidden'
 * correctly... but closing the OUTER one first restores the pre-lock value while
 * the inner dialog is still on screen, unlocking the page behind a live modal.
 *
 * So the lock is refcounted: the first open captures and locks, the last close
 * restores. Latent until now only because nothing nested.
 */
let openCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

/**
 * Is any dialog currently open?
 *
 * Read by EmailCapturePopup, which must not stack itself on top of the cart
 * popup. Deliberately a plain function rather than a subscribable store: the
 * popup only ever asks at the instant a trigger fires, and nothing needs to
 * re-render when the answer changes.
 */
export function anyModalOpen(): boolean {
  return openCount > 0;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Visible title. Used as the accessible name via aria-labelledby. */
  title: string;
  /** Render the title visually. Off for overlays with their own visual header. */
  showTitle?: boolean;
  className?: string;
  overlayClassName?: string;
  children: ReactNode;
}

/**
 * Accessible dialog.
 *
 * Replaces four hand-rolled overlays (cart popup, gallery carousel, mobile
 * search, product lightbox) that between them had no role="dialog", no
 * aria-modal, no accessible name, no focus trap, no focus restore, no Escape
 * handling and no scroll lock. A screen-reader user pressing "Add to cart" saw
 * the popup appear visually while focus and the virtual cursor stayed on the
 * now-obscured button, with nothing announced.
 */
export default function Modal({
  open,
  onClose,
  title,
  showTitle = false,
  className,
  overlayClassName,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Move focus into the dialog so the next Tab lands inside it.
    const node = dialogRef.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    // Scroll lock, compensating for the scrollbar so the page does not jump.
    // Refcounted - only the outermost dialog touches the body; see openCount.
    const { body, documentElement } = document;
    openCount += 1;
    if (openCount === 1) {
      const scrollBarWidth = window.innerWidth - documentElement.clientWidth;
      savedOverflow = body.style.overflow;
      savedPaddingRight = body.style.paddingRight;
      body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        el => el.offsetParent !== null || el === document.activeElement
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) {
        body.style.overflow = savedOverflow;
        body.style.paddingRight = savedPaddingRight;
      }
      // Return focus to whatever opened the dialog.
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={overlayClassName}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={className}
      >
        <h2 id={titleId} className={showTitle ? undefined : 'visually-hidden'}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
