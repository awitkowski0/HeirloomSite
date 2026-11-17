'use client';

import Link from 'next/link';
import { useCart } from '@/context/useCart';
import { formatPrice } from '@/lib/format';
import { variantLabel } from '@/lib/labels';
import { liveChatEnabled, openLiveChat } from '@/lib/live-chat';
import { capture } from '@/lib/posthog-client';
import { PUBLISHED_PHONE, PUBLISHED_PHONE_TEL } from '@/lib/published-contact';

/**
 * "Rather finish this with a person?" on /checkout.
 *
 * The customer has built the cart themselves; this hands it to a person.
 * "Chat with us" opens Crisp with the cart attached: staff see each line and
 * the subtotal beside the conversation, and the customer's message box starts
 * with a one-line summary they can edit. After talking it through, staff send
 * a fill link (made on /staff/checkout-link) that fills this checkout in; the
 * customer still reviews it and places the order. See src/lib/checkout-fill.ts.
 *
 * Without Crisp configured it offers the phone instead, which works the same
 * way: the fill link can be emailed or texted.
 */
export default function CheckoutChatHelp() {
  const { cart, hydrated, subtotal } = useCart();
  if (!hydrated || cart.length === 0) return null;

  const lines = cart.map(l => {
    const finish = variantLabel(l.wood, l.stainName);
    return `${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.productName}${finish ? ` (${finish})` : ''}`;
  });

  const start = () => {
    capture('checkout_chat_opened', { lines: cart.length });
    openLiveChat({
      message: `Hi, I'd like help finishing my order: ${lines.join(', ')}.`,
      data: {
        source: 'checkout',
        cart_lines: lines.join(' | ').slice(0, 500),
        cart_subtotal: formatPrice(subtotal),
      },
    });
  };

  return (
    <aside className="checkout-chat" aria-labelledby="checkout-chat-title">
      <h2 id="checkout-chat-title" className="checkout-chat-title">
        Rather finish this with a person?
      </h2>
      <p className="checkout-chat-copy">
        We’ll go over the stain, the kits and delivery with you, then fill this page in for you to check and place.
      </p>
      {liveChatEnabled ? (
        <button type="button" className="button-secondary checkout-chat-button" onClick={start}>
          Chat with us about this order
        </button>
      ) : (
        <p className="checkout-chat-copy">
          Call <a href={`tel:${PUBLISHED_PHONE_TEL}`}>{PUBLISHED_PHONE}</a> or{' '}
          <Link href="/contact">send us a message</Link>.
        </p>
      )}
    </aside>
  );
}
