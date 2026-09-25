import InvoiceDetailClient from './invoice-detail-client';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function InvoiceDetailPage() {
  return <InvoiceDetailClient />;
}
