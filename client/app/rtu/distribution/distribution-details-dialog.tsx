'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RTUDistribution } from '@/lib/type/rtu_distribution';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import {
  Eye,
  Truck,
  Package,
  Box,
  Store,
  AlertTriangle,
  History,
  TrendingDown,
  Printer
} from 'lucide-react';
import { useGetRTUDistribution } from '@/lib/hooks/queries/rtu-distribution';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { PrintHeader } from '@/components/print/print-header';
import { PrintFooter } from '@/components/print/print-footer';
import { DocumentStatusBadge } from '@/components/ui/document-status-badge';

interface DetailsDialogProps {
  distribution: RTUDistribution;
  customTrigger?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function DistributionDetailsDialog({
  distribution: initialDist,
  customTrigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onClose
}: DetailsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (v: boolean) => {
    if (isControlled) {
      setControlledOpen?.(v);
    } else {
      setInternalOpen(v);
    }
    if (!v) onClose?.();
  };

  const { data: distribution } = useGetRTUDistribution(initialDist._id);
  const dist = distribution || initialDist;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {customTrigger ? (
        <DialogTrigger asChild>{customTrigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0 rounded-sm hover:bg-blue-50 hover:text-blue-600 text-blue-600 cursor-pointer"
            icon={Eye}
          />
        </DialogTrigger>
      )}
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 rounded-sm border border-gray-150 shadow-2xl text-gray-900 overflow-hidden">
        {/* PROFESSIONAL PRINT SECTION */}
        <div className="print-only">
          <PrintHeader
            title="SURAT JALAN / DELIVERY NOTE"
            docNumber={dist.docNumber}
            dateLabel="Tanggal Pengiriman"
            dateValue={dist.shipmentDate}
          />

          <div className="grid grid-cols-3 gap-6 mb-8 text-left">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Pengirim (Outlet Asal):
              </p>
              <p className="text-base font-bold">
                {dist.sourceOutlet?.label || 'Central Kitchen (Default)'}
              </p>
              <p className="text-[10px] font-bold text-gray-500">
                {dist.sourceOutlet?.address || '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Penerima (Outlet Tujuan):
              </p>
              <p className="text-base font-bold">
                {dist.vendor
                  ? `${dist.vendor.name} (Vendor)`
                  : dist.outlet?.label}
              </p>
              <p className="text-[10px] font-bold text-gray-500">
                {dist.vendor
                  ? dist.vendor.address || '-'
                  : dist.outlet?.address || 'Alamat tidak terdaftar'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Tanggal Pengiriman:
              </p>
              <p className="text-base font-bold">
                {dist.shipmentDate
                  ? dayjs(dist.shipmentDate).format('DD MMMM YYYY')
                  : '-'}
              </p>
              <p className="text-[10px] font-bold text-gray-500 italic">
                Logistics Team
              </p>
            </div>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th className="text-left w-16">No</th>
                <th className="text-left">Nama Item (Produk/Material)</th>
                <th className="text-right">Jumlah (Qty)</th>
                <th className="text-center">Satuan</th>
                <th className="text-left">Batch / Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {dist.items.map((item, idx) => {
                const isMaterial = dist.type === 'MATERIAL';
                const itemName = isMaterial
                  ? item.material?.brand
                    ? `${item.material.name} (${item.material.brand})`
                    : item.material?.name
                  : item.product?.name;
                return (
                  <tr key={item._id}>
                    <td>{idx + 1}</td>
                    <td className="font-bold">{itemName || '-'}</td>
                    <td className="text-right">{item.qty}</td>
                    <td className="text-center italic">{item.unit}</td>
                    <td className="text-xs text-gray-500 font-mono italic">
                      {item.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-8 border-2 border-black p-4">
            <p className="text-[10px] font-bold uppercase mb-1">
              Catatan Pengiriman:
            </p>
            <p className="text-sm italic">
              &quot;
              {dist.notes ||
                'Barang telah diperiksa dan dalam kondisi baik saat meninggalkan CK.'}
              &quot;
            </p>
          </div>

          <PrintFooter className="mt-8" />
        </div>

        {/* SCREEN SECTION (Hidden on Print) */}
        <div className="no-print flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
          <DialogHeader className="pt-1 px-1">
            <div className="flex justify-between items-center">
              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <DocumentStatusBadge
                    status={dist.status}
                    type="DISTRIBUTION"
                  />
                  <div className="h-1 w-1 rounded-full bg-gray-300" />
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-tight">
                    Dibuat {dayjs(dist.createdAt).format('DD MMM YYYY HH:mm')}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-gray-300 font-mono font-normal">#</span>
                  <span className="font-mono text-gray-800">
                    {dist.docNumber}
                  </span>
                </DialogTitle>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-sm font-semibold h-9 px-3 border-gray-200 gap-1.5 hover:bg-gray-50 flex items-center text-xs cursor-pointer"
                  icon={Printer}
                >
                  Cetak Surat Jalan
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-4 rounded-sm border border-gray-200/80 flex items-center gap-3.5 shadow-sm text-left">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-sm flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 block">
                  Outlet Asal
                </span>
                <p className="font-bold text-gray-800 text-sm leading-tight tracking-tight text-left">
                  {dist.sourceOutlet?.label || 'Central Kitchen (Default)'}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-sm border border-gray-200/80 flex items-center gap-3.5 shadow-sm text-left">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-sm flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 block">
                  Outlet Tujuan
                </span>
                <p className="font-bold text-gray-800 text-sm leading-tight tracking-tight text-left">
                  {dist.vendor
                    ? `${dist.vendor.name} (Vendor)`
                    : dist.outlet?.label}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-sm border border-gray-200/80 flex items-center gap-3.5 shadow-sm text-left">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-sm flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 block">
                  Waktu Kirim
                </span>
                <p className="font-semibold text-gray-700 text-sm leading-tight tracking-tight text-left">
                  {dist.shipmentDate
                    ? dayjs(dist.shipmentDate).format('DD MMM YYYY • HH:mm')
                    : 'Pending Shipment'}
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/40 p-4 rounded-sm border border-emerald-100 flex items-center gap-3.5 shadow-sm text-left">
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-sm flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-emerald-700/60 uppercase tracking-wider mb-0.5 block">
                  Total Unit
                </span>
                <p className="font-semibold text-sm text-emerald-800 leading-tight text-left">
                  <span className="text-base font-bold">
                    {dist.items.reduce((acc, i) => acc + i.qty, 0)}
                  </span>{' '}
                  <span className="text-[10px] text-emerald-600/75 uppercase font-medium">
                    Items
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Item Table */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-semibold uppercase text-gray-700 tracking-wider">
                  Rincian Barang Dikirim
                </h3>
              </div>
              <Badge
                variant="secondary"
                className="font-medium text-[9px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-sm"
              >
                SNAPSHOT PRICE & COST
              </Badge>
            </div>

            <div className="rounded-sm border border-gray-200 overflow-hidden shadow-sm bg-white w-full">
              <Table className="w-full" containerClassName="h-auto w-full">
                <TableHeader className="bg-slate-900">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-white text-[11px] font-bold uppercase py-2.5 pl-5">
                      Item Details
                    </TableHead>
                    <TableHead className="text-white text-[11px] font-bold uppercase text-right py-2.5">
                      Qty Shipped
                    </TableHead>
                    <TableHead className="text-white text-[11px] font-bold uppercase text-right py-2.5 pr-5">
                      Batch/Notes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dist.items.map((item) => {
                    const isMaterial = dist.type === 'MATERIAL';
                    const name = isMaterial
                      ? item.material?.name
                      : item.product?.name;
                    const code = isMaterial
                      ? item.material?.code
                      : item.product?.code;

                    return (
                      <TableRow
                        key={item._id}
                        className="border-gray-100 hover:bg-gray-50 transition-colors group"
                      >
                        <TableCell className="pl-5 py-2">
                          <div className="flex items-center py-1 min-h-[20px]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-sm bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-white transition-colors shrink-0">
                                {isMaterial ? (
                                  <Box className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                ) : (
                                  <Package className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                )}
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-gray-800 tracking-tight text-xs flex items-center leading-normal">
                                  {name || '-'}
                                  {isMaterial && item.material?.brand && (
                                    <span className="text-gray-400 font-normal ml-1 text-[11px]">
                                      ({item.material.brand})
                                    </span>
                                  )}
                                </span>
                                <span className="text-[9px] font-medium text-gray-400 font-mono tracking-normal leading-tight mt-0.5">
                                  {code || '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <div className="flex items-center justify-end py-1 min-h-[20px]">
                            <span className="font-semibold text-xs text-gray-800 tracking-tight whitespace-nowrap">
                              {item.qty}{' '}
                              <span className="text-[10px] text-gray-500 font-medium ml-0.5">
                                {item.unit}
                              </span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-5 py-2">
                          <div className="flex items-center justify-end py-1 min-h-[20px]">
                            <span className="italic font-medium text-gray-400 text-xs">
                              {item.notes || '-'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {dist.notes && (
            <div className="mt-6 p-4 bg-amber-50/40 rounded-sm border border-amber-100/60 flex gap-3 text-left">
              <div className="p-2 bg-white rounded-sm shadow-sm text-amber-500 h-fit">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-amber-600 tracking-wider mb-0.5">
                  Catatan Pengiriman
                </p>
                <p className="text-xs text-amber-800 font-medium leading-relaxed italic">
                  &quot;{dist.notes}&quot;
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="no-print sticky bottom-0 bg-white border-t border-gray-100 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] flex flex-col">
          <DialogFooter className="p-4 flex flex-col sm:flex-row gap-3 justify-between items-center w-full">
            <Button
              variant="outline"
              className="rounded-sm font-semibold h-10 px-5 border-gray-200 text-gray-600 transition-all hover:bg-gray-50 flex-1 md:flex-none text-xs cursor-pointer"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>

            <div className="flex flex-1 sm:flex-none gap-2 justify-end items-center">
              {dist.status === 'RECEIVED' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-sm border border-blue-100/50">
                  <TrendingDown className="w-4 h-4 text-blue-600" />
                  <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                    Stock ledger has been updated for Central Kitchen
                  </p>
                </div>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
