'use client';

import { useState, Fragment } from 'react';
import {
  Layers,
  Calendar,
  DollarSign,
  RefreshCw,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useGetRTUProductLots } from '@/lib/hooks/queries/rtu-product';

interface ProductLotsDialogProps {
  product: {
    _id: string;
    name: string;
    code: string;
    outputUnit: string;
  };
  outletId: string;
}

export function ProductLotsDialog({
  product,
  outletId
}: ProductLotsDialogProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useGetRTUProductLots(product._id, outletId);

  const lots = data?.data || [];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2
    }).format(val);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-sm font-bold text-[10px] px-2 h-6 gap-1 border-blue-200 hover:bg-blue-50 text-blue-700 hover:text-blue-800"
        >
          <Layers className="w-3 h-3 mr-1" /> FIFO Lots
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden p-0 rounded-sm border-none shadow-2xl bg-white flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                <Layers className="w-6 h-6 text-blue-600" />
                Breakdown Lot FIFO - {product.name}
              </DialogTitle>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                Product Code: {product.code}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : lots.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <Layers className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-bold text-sm">
                Tidak Ada Lot Aktif
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Stok produk ini kosong atau belum memiliki catatan lot di outlet
                terpilih.
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 rounded-sm border border-gray-100 shadow-sm overflow-hidden">
              <Table containerClassName="h-auto" className="w-full">
                <TableHeader className="bg-slate-900 sticky top-0 z-10">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold py-3 pl-4">
                      Nomor Lot
                    </TableHead>
                    <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold py-3">
                      Tanggal Terima / Produksi
                    </TableHead>
                    <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold py-3 text-right">
                      Initial Qty
                    </TableHead>
                    <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold py-3 text-right">
                      Remaining Qty
                    </TableHead>
                    <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        Unit Cost (HPP)
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[250px] text-xs leading-relaxed bg-slate-800 border-slate-700 text-white font-medium p-3"
                            >
                              HPP (Harga Pokok Penjualan) ini didapatkan dari{' '}
                              <span className="font-bold text-blue-400">
                                total nilai bahan baku
                              </span>{' '}
                              yang digunakan pada proses produksi (Material
                              Cost).
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold py-3 text-center pr-4">
                      Source Doc
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((lot: any) => {
                    const isDeficit = lot.qtyRemaining < 0;
                    return (
                      <Fragment key={lot._id}>
                        <TableRow
                          className={`hover:bg-slate-50 transition-colors ${
                            isDeficit ? 'bg-red-50/40 hover:bg-red-50/60' : ''
                          }`}
                        >
                          <TableCell className="font-mono text-xs font-bold py-3.5 pl-4">
                            {lot.lotNumber}
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 py-3.5">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {formatDateTime(lot.receivedDate)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-semibold py-3.5 text-right">
                            {lot.qtyInitial} {product.outputUnit}
                          </TableCell>
                          <TableCell className="text-xs font-bold py-3.5 text-right">
                            <span
                              className={
                                isDeficit ? 'text-red-600' : 'text-emerald-700'
                              }
                            >
                              {lot.qtyRemaining} {product.outputUnit}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-semibold py-3.5 text-right">
                            <span className="flex items-center justify-end gap-1 font-mono">
                              <DollarSign className="w-3 h-3 text-gray-400" />
                              {formatCurrency(lot.unitPrice)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-3.5 text-center pr-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className={`text-[9px] font-bold uppercase tracking-wider ${
                                  isDeficit
                                    ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                    : ''
                                }`}
                              >
                                <FileText className="w-2.5 h-2.5 mr-1 shrink-0" />
                                {isDeficit ? 'DEFICIT' : lot.refType || 'BATCH'}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {lot.movements && lot.movements.length > 0 && (
                          <TableRow className="bg-slate-50/30 border-b border-gray-100 hover:bg-slate-50/30">
                            <TableCell colSpan={6} className="p-0 border-none">
                              <div className="bg-slate-100/50 py-2.5 px-6 border-l-4 border-blue-400 ml-4 my-1.5 text-xs rounded-r-md">
                                <p className="font-bold text-gray-500 mb-1.5 text-[9px] uppercase tracking-wider flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3" /> Usage
                                  History / Deductions
                                </p>
                                <div className="space-y-1">
                                  {lot.movements.map((m: any) => (
                                    <div
                                      key={m._id}
                                      className="text-gray-500 flex items-center justify-between max-w-md bg-white px-3 py-1.5 rounded border border-gray-100 shadow-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400 font-medium min-w-[90px]">
                                          {new Date(
                                            m.createdAt
                                          ).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] uppercase font-bold py-0 h-4 bg-gray-50"
                                        >
                                          {m.refType}
                                        </Badge>
                                        {m.refInfo && (
                                          <span className="text-[10px] font-bold text-gray-600 truncate max-w-[120px]">
                                            {m.refInfo}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-mono text-red-600 font-bold text-xs shrink-0 ml-2">
                                        -{m.qtyDeducted} {product.outputUnit}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
