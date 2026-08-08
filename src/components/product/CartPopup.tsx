'use client';

import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import { humanizeWood } from '@/components/search/SearchResultItem';
import { stainLabel } from '@/lib/stainColors';

interface Props {
  open: boolean;
  productName: string;
  wood: string;
  stain: string;
  onClose: () => void;
}

/**
 * Add-to-cart confirmation.
 *
 * Now a real dialog. Previously a bare <div onClick> with no role, no accessible
 * name and no focus management: a screen-reader user pressed "Add to cart", the
 * popup appeared visually, and focus plus the virtual cursor stayed on the
 * now-obscured button with nothing announced.
 */
export default function CartPopup({ open, productName, wood, stain, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Added to cart"
      showTitle
      overlayClassName="cart-popup-overlay"
      className="cart-popup-content"
    >
      <span className="material-symbols-outlined cart-popup-icon" aria-hidden="true">
        check_circle
      </span>
      <p className="body-md text-on-surface-variant cart-popup-detail">
        {productName} — {humanizeWood(wood)} / {stainLabel(stain)}
      </p>
      <div className="cart-popup-actions">
        <Link href="/checkout" className="button-primary">
          Go to Cart
        </Link>
        <button type="button" onClick={onClose} className="button-secondary">
          Continue Shopping
        </button>
      </div>
    </Modal>
  );
}
