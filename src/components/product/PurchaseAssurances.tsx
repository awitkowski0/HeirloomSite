import Link from 'next/link';
/* The delivery title reads from order-terms (via delivery-line) so it can never
   quote a different number from the checkout that charges it. */
import { deliveryLineTitle } from '@/lib/delivery-line';
import type { TwoStageNote } from '@/lib/mini-newport-conversion';

/*
 * The four questions a first-time buyer of a $2,500 crib from an unknown brand
 * actually has, answered where the decision is made rather than on a policy
 * page they will not go looking for.
 *
 * This sits directly under Add to Cart, which matters most on a phone: the
 * button is the last thing on screen before the footer, so anything placed
 * after it is the last thing read before buying or leaving.
 *
 * Every line is checked against what the site can back. Delivery is a PRICED
 * choice at checkout, so this names the tiers instead of promising they are
 * free - it said "no shipping charge at checkout" while the checkout was about
 * to add a delivery charge. The lead time is the one the catalogue quotes; the standards
 * claim is the one already made in 180 product descriptions and consolidated
 * on /safety.
 */

const ASSURANCES: { icon: string; title: string; body: string; href?: string }[] = [
  {
    icon: 'local_shipping',
    title: deliveryLineTitle(),
    body: 'The charge depends on your order total. Delivered by our trusted partners, one charge per order, chosen at checkout. No surprise freight bill on arrival.',
  },
  {
    icon: 'handyman',
    title: 'Built to convert as they grow',
    body: 'Solid hardwood and hardware made to be taken apart and rebuilt as it converts.',
  },
  {
    icon: 'schedule',
    title: 'Made to order',
    body: 'Built after you order in the wood and finish you picked, rather than pulled from a warehouse. We confirm your lead time when you order.',
    href: '/timeline',
  },
  {
    icon: 'chat_bubble',
    title: 'Talk to a person first',
    body: 'Unsure between two finishes, or trying to coordinate with an existing piece? Ask before you buy.',
    href: '/contact',
  },
];

export default function PurchaseAssurances({
  showConversion = false,
  conversionNote = null,
}: {
  /** 4-in-1 line, only when the catalogue shows a full-size convertible crib. */
  showConversion?: boolean;
  /** Mini Newport 2-stage note (Brand part b). Replaces the 4-in-1 assurance when set. */
  conversionNote?: TwoStageNote | null;
}) {
  const items = ASSURANCES.filter(a => a.title !== 'Built to convert as they grow' || (showConversion && !conversionNote));
  return (
    <ul className="assurances">
      {items.map(a => (
        <li key={a.title} className="assurance">
          <span className="material-symbols-outlined assurance-icon" aria-hidden="true">
            {a.icon}
          </span>
          <span className="assurance-body">
            <span className="assurance-title">
              {a.href ? (
                <Link href={a.href} className="assurance-link">
                  {a.title}
                </Link>
              ) : (
                a.title
              )}
            </span>
            {a.body ? <span className="assurance-copy">{a.body}</span> : null}
          </span>
        </li>
      ))}
      {conversionNote ? (
        <li className="assurance" key={conversionNote.heading}>
          <span className="material-symbols-outlined assurance-icon" aria-hidden="true">
            handyman
          </span>
          <span className="assurance-body">
            <span className="assurance-title">{conversionNote.heading}</span>
            <span className="assurance-copy">
              {conversionNote.stages.map(stage => (
                <span key={stage.label} className="assurance-stage">
                  {stage.label}: {stage.text}
                </span>
              ))}
            </span>
          </span>
        </li>
      ) : null}
    </ul>
  );
}
