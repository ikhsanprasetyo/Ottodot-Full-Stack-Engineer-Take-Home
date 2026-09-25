'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  Printer,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api/api';

interface InvoiceItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerAddress: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export default function InvoiceDetailClient() {
  const params = useParams();
  const rawParamId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = useMemo(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== 'invoice') {
        return lastPart;
      }
    }
    return (rawParamId as string) || '';
  }, [rawParamId]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItems, setConfirmItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/rtu/invoice/${id}`);
        setInvoice(response.data.data);
      } catch {
        toast.error('Gagal memuat data invoice');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchInvoice();
  }, [id]);

  const openConfirmDialog = () => {
    if (!invoice) return;
    // Deep copy items for editing
    setConfirmItems(invoice.items.map((item) => ({ ...item })));
    setConfirmOpen(true);
  };

  const updateConfirmItem = (
    index: number,
    field: 'qty' | 'unitPrice',
    value: number
  ) => {
    const updated = [...confirmItems];
    updated[index] = { ...updated[index], [field]: value };
    updated[index].subtotal = updated[index].qty * updated[index].unitPrice;
    setConfirmItems(updated);
  };

  const confirmTotal = confirmItems.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );

  const handleConfirm = async () => {
    if (!invoice) return;
    try {
      setUpdating(true);
      await api.patch(`/rtu/invoice/${id}/confirm`, { items: confirmItems });
      setInvoice({
        ...invoice,
        items: confirmItems,
        totalAmount: confirmTotal,
        status: 'completed'
      });
      setConfirmOpen(false);
      toast.success('Invoice dikonfirmasi');
    } catch {
      toast.error('Gagal mengkonfirmasi invoice');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    try {
      setUpdating(true);
      await api.patch(`/rtu/invoice/${id}/status`, { status: 'cancelled' });
      setInvoice({ ...invoice, status: 'cancelled' });
      toast.success('Invoice dibatalkan');
    } catch {
      toast.error('Gagal membatalkan invoice');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-600"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Invoice tidak ditemukan</p>
        <Link href="/rtu/invoice">
          <Button variant="outline" className="mt-4">
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/rtu/invoice">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kembali
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
          {getStatusBadge(invoice.status)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-1" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Nama</span>
              <p className="font-medium">{invoice.customerName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Alamat</span>
              <p className="font-medium">{invoice.customerAddress}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">No. Invoice</span>
              <p className="font-medium font-mono">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tanggal</span>
              <p className="font-medium">
                {new Date(invoice.createdAt).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="mt-1">{getStatusBadge(invoice.status)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Produk</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Harga Satuan</th>
                  <th className="text-right py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{item.productName}</td>
                    <td className="text-right py-2">{item.qty}</td>
                    <td className="text-right py-2">
                      Rp {item.unitPrice?.toLocaleString('id-ID')}
                    </td>
                    <td className="text-right py-2">
                      Rp {item.subtotal?.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right pt-4 font-medium">
                    Total
                  </td>
                  <td className="text-right pt-4 font-bold">
                    Rp {invoice.totalAmount?.toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catatan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {invoice.status === 'pending' && (
        <div className="flex gap-3 justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={updating}>
                <XCircle className="w-4 h-4 mr-1" />
                Batalkan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Batalkan Invoice?</DialogTitle>
                <DialogDescription>
                  Invoice ini akan dibatalkan dan tidak bisa diubah kembali.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" className="font-bold">
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  className="font-bold"
                >
                  Ya, Batalkan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button disabled={updating} onClick={openConfirmDialog}>
            <CheckCircle className="w-4 h-4 mr-1" />
            Konfirmasi
          </Button>
        </div>
      )}

      {/* Confirmation Dialog with editable qty & harga satuan */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Konfirmasi Invoice</DialogTitle>
            <DialogDescription>
              Periksa dan sesuaikan qty serta harga satuan sebelum konfirmasi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1 border-b pb-2">
              <div className="col-span-4">Produk</div>
              <div className="col-span-3 text-right">Qty</div>
              <div className="col-span-4 text-right">Harga Satuan</div>
              <div className="col-span-1 text-right">Sub</div>
            </div>

            {confirmItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <p className="text-sm font-medium">{item.productName}</p>
                </div>
                <div className="col-span-3">
                  <Label className="sr-only">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) =>
                      updateConfirmItem(
                        index,
                        'qty',
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="text-right h-8 text-sm"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="sr-only">Harga Satuan</Label>
                  <Input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateConfirmItem(
                        index,
                        'unitPrice',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="text-right h-8 text-sm"
                  />
                </div>
                <div className="col-span-1 text-right">
                  <p className="text-xs text-muted-foreground">
                    {item.subtotal.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 items-center border-t pt-2 mt-2">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-bold">
                Rp {confirmTotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={updating}
            >
              Batal
            </Button>
            <Button onClick={handleConfirm} disabled={updating}>
              <CheckCircle className="w-4 h-4 mr-1" />
              {updating ? 'Menyimpan...' : 'Konfirmasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
