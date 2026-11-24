import { INVOICE_MODEL_NOTICE } from '@/lib/invoice-model-copy';

/** Same published invoice-model wording at every checkout step. */
export default function InvoiceModelNote({ className }: { className?: string }) {
  return (
    <p className={className ?? 'body-md invoice-model-note'}>{INVOICE_MODEL_NOTICE}</p>
  );
}
