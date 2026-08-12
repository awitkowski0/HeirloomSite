import type { Metadata } from 'next';
import { Suspense } from 'react';
import OrderConfirmationClient from '@/components/order/OrderConfirmationClient';

export const metadata: Metadata = {
  title: 'Order confirmation',
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="container narrow-page"><p className="body-lg">Loading your order…</p></div>}>
      <OrderConfirmationClient paymentIntentId={id} />
    </Suspense>
  );
}
