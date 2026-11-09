import Link from 'next/link';
import { formatPriceApprox } from '@/lib/format';
import { deliveryChargeFor } from '@/lib/order-terms';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/hours';

/* One line where there used to be a block repeated on every page. */
export default function PurchaseAssurances() {
  return (
    <p className="small pdp-assure">
      Made to order · <Link href="/shipping">Delivery from {formatPriceApprox(deliveryChargeFor(0, 'threshold') / 100)}</Link> · Questions? <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
    </p>
  );
}
