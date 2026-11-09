import TalkToPerson from '@/components/layout/TalkToPerson';
import { formatPriceApprox } from '@/lib/format';
import { deliveryChargeFor } from '@/lib/order-terms';

/* One line, read from order-terms so it cannot disagree with what checkout charges. */
export default function PurchaseAssurances() {
  return (
    <p className="assurance-line">
      Made to order · Delivery from {formatPriceApprox(deliveryChargeFor(0, 'threshold') / 100)} · <TalkToPerson />
    </p>
  );
}
