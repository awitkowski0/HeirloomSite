import Link from 'next/link';

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
 * to add $685. The lead time is the one the catalogue quotes; the standards
 * claim is the one already made in 180 product descriptions and consolidated
 * on /safety.
 */

const ASSURANCES: { icon: string; title: string; body: string; href?: string }[] = [
  {
    icon: 'local_shipping',
    title: 'Threshold or white-glove delivery',
    body: 'Delivered by our trusted partners, priced at checkout. No surprise freight bill on arrival.',
  },
  {
    icon: 'verified_user',
    title: 'Built to CPSC and ASTM standards',
    body: 'Solid hardwood, non-toxic baby-safe finishes, and hardware made to be taken apart and rebuilt as it converts.',
    href: '/safety',
  },
  {
    icon: 'schedule',
    title: 'Made to order, six to eight weeks',
    body: 'Built after you order in the wood and finish you picked, rather than pulled from a warehouse.',
  },
  {
    icon: 'chat_bubble',
    title: 'Talk to a person first',
    body: 'Unsure between two finishes, or matching an existing piece? Ask before you buy.',
    href: '/contact',
  },
];

export default function PurchaseAssurances() {
  return (
    <ul className="assurances">
      {ASSURANCES.map(a => (
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
            <span className="assurance-copy">{a.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
