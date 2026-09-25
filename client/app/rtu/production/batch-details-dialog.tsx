'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RTUProductionBatch } from '@/lib/type/rtu_production_batch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import dayjs from 'dayjs';
import {
  Eye,
  Play,
  CheckCircle2,
  Package,
  ChefHat,
  TrendingUp,
  Coins,
  Printer,
  History,
  AlertTriangle,
  Calculator
} from 'lucide-react';
import api from '@/lib/api/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetRTUProductionBatches,
  useGetRTUProductionBatch
} from '@/lib/hooks/queries/rtu-production-batch';
import { useGetRTUMonthlyHPP } from '@/lib/hooks/queries/rtu-hpp';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn, toIDR } from '@/lib/utils';
import { FormInput } from '@/components/ui/form-input';
import { HistoryLogTable } from '@/components/shared/history-log-table';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Logo } from '@/components/ui/logo';

// --- Validation Schemas ---
const completeSchema = z.object({
  actualQty: z.number().min(0.001, 'Qty is required'),
  notes: z.string().optional(),
  materialUsages: z.array(
    z.object({
      materialId: z.string(),
      actualQty: z.number().min(0),
      _id: z.string().optional()
    })
  ),
  laborItems: z.array(
    z.object({
      description: z.string().min(1, 'Desc required'),
      workerCount: z.number().min(1),
      hoursWorked: z.number().min(0),
      ratePerHour: z.number().min(0)
    })
  ),
  overheadItems: z.array(
    z.object({
      description: z.string().min(1, 'Desc required'),
      cost: z.number().min(0)
    })
  )
});

type CompleteFormValues = z.infer<typeof completeSchema>;

interface BatchDetailsDialogProps {
  batch: RTUProductionBatch;
  customTrigger?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function BatchDetailsDialog({
  batch: initialBatch,
  customTrigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onClose
}: BatchDetailsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (v: boolean) => {
    if (isControlled) {
      setControlledOpen?.(v);
    } else {
      setInternalOpen(v);
    }
    if (!v) {
      setView('details');
      onClose?.();
    }
  };

  const [view, setView] = useState<'details' | 'complete'>('details');
  const [printMode, setPrintMode] = useState<'label' | 'sheet'>('label');
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: fullBatchData } = useGetRTUProductionBatch(
    initialBatch._id,
    open
  );
  const batch = fullBatchData?.data || initialBatch;

  const form = useForm<CompleteFormValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      actualQty: initialBatch.actualQty,
      materialUsages:
        initialBatch.materialUsages?.map((m) => ({
          materialId: m.materialId,
          actualQty: m.plannedQty, // default to planned
          _id: m._id
        })) || [],
      laborItems: [],
      overheadItems: []
    }
  });

  useEffect(() => {
    if (open && batch.materialUsages && batch.materialUsages.length > 0) {
      form.reset({
        actualQty: batch.actualQty,
        materialUsages:
          batch.materialUsages.map((m) => ({
            materialId: m.materialId,
            actualQty: m.plannedQty, // default to planned
            _id: m._id
          })) || [],
        laborItems: [],
        overheadItems: []
      });
    }
  }, [open, batch.materialUsages, batch.actualQty, form]);

  const {
    handleSubmit,
    watch,
    setValue,
    formState: {}
  } = form;

  const { data: allBatchesData } = useGetRTUProductionBatches();
  const allBatches = allBatchesData?.data;

  const plannedMonthYear = dayjs(batch.plannedDate).format('YYYY-MM');
  const { data: monthlyHPPData } = useGetRTUMonthlyHPP(
    batch.outletId,
    plannedMonthYear
  );
  const monthlyHPP = monthlyHPPData?.data;

  const lastCompletedBatch = useMemo(() => {
    const list = allBatches || [];
    return list
      .filter(
        (b: any) =>
          b.productId === batch.productId &&
          b.status === 'completed' &&
          !b.isDeleted
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.completedDate || b.updatedAt).getTime() -
          new Date(a.completedDate || a.updatedAt).getTime()
      )[0];
  }, [allBatches, batch.productId]);

  useEffect(() => {
    if (open && view === 'complete') {
      if (lastCompletedBatch) {
        const labor =
          lastCompletedBatch.laborItems?.map((l: any) => ({
            description: l.description,
            workerCount: l.workerCount,
            hoursWorked: l.hoursWorked,
            ratePerHour: l.ratePerHour
          })) || [];
        if (labor.length > 0) {
          setValue('laborItems', labor);
        }

        const overhead =
          lastCompletedBatch.overheadItems?.map((o: any) => ({
            description: o.description,
            cost: o.cost
          })) || [];
        if (overhead.length > 0) {
          setValue('overheadItems', overhead);
        }
      }
    }
  }, [open, view, lastCompletedBatch, setValue]);

  // --- Realtime Cost Calculation ---
  const watchAll = watch();
  const summary = useMemo(() => {
    const matCost = (batch.materialUsages || []).reduce((acc, m, idx) => {
      const actual = watchAll.materialUsages?.[idx]?.actualQty || 0;
      return acc + actual * m.unitCost;
    }, 0);

    let laborCost = 0;
    let overheadCost = 0;

    if (monthlyHPP && monthlyHPP.totalMaterialCost > 0) {
      const ratio = matCost / monthlyHPP.totalMaterialCost;
      laborCost = monthlyHPP.totalLaborCost * ratio;
      overheadCost = monthlyHPP.totalOverheadCost * ratio;
    }

    const total = matCost + laborCost + overheadCost;
    const unitCost = watchAll.actualQty > 0 ? total / watchAll.actualQty : 0;

    return { matCost, laborCost, overheadCost, total, unitCost };
  }, [watchAll, batch.materialUsages, monthlyHPP]);

  // --- Handlers ---
  const handleStart = async () => {
    setIsProcessing(true);
    try {
      await api.post(`/rtu/batch/start/${batch._id}`);
      toast.success('Production Batch started');
      queryClient.invalidateQueries({ queryKey: ['rtu-production-batches'] });
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this production batch? No stock will be deducted.'))
      return;
    setIsProcessing(true);
    try {
      await api.post(`/rtu/batch/cancel/${batch._id}`);
      toast.success('Batch cancelled');
      queryClient.invalidateQueries({ queryKey: ['rtu-production-batches'] });
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = (mode: 'label' | 'sheet') => {
    setPrintMode(mode);
    setTimeout(() => window.print(), 100);
  };

  const onCompleteSubmit = async (data: CompleteFormValues) => {
    if (!monthlyHPP) {
      toast.error(
        'HPP Bulanan belum diinput untuk bulan ini. Silakan input HPP Bulanan terlebih dahulu.'
      );
      return;
    }

    setIsProcessing(true);
    try {
      const ratio = summary.matCost / (monthlyHPP.totalMaterialCost || 1);

      const payload = {
        ...data,
        laborItems: [
          {
            description: 'Proporsional Upah Karyawan',
            workerCount: 1,
            hoursWorked: 1,
            ratePerHour: monthlyHPP.totalLaborCost * ratio
          }
        ],
        overheadItems: [
          {
            description: 'Proporsional Overhead (Listrik, Air, dsb)',
            cost: monthlyHPP.totalOverheadCost * ratio
          }
        ]
      };

      await api.post(`/rtu/batch/complete/${batch._id}`, payload);
      toast.success('Production Batch completed successfully');
      queryClient.invalidateQueries({ queryKey: ['rtu-production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-products'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-stock-ledgers'] });
      handleOpenChange(false);
      setView('details');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete batch');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {customTrigger ? (
        <DialogTrigger asChild>{customTrigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-orange-50 hover:text-orange-600 cursor-pointer rounded-sm"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className={cn(
          'max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-sm border-none shadow-2xl transition-all duration-300',
          view === 'complete' ? 'max-w-7xl' : 'max-w-6xl'
        )}
      >
        {/* PROFESSIONAL PRINT SECTION */}
        <div className="print-only">
          {printMode === 'label' ? (
            /* BATCH LABEL TEMPLATE */
            <div className="w-[8cm] h-[5cm] border-2 border-black p-4 mx-auto flex flex-col justify-between">
              <div className="flex justify-between items-start border-b border-black pb-1 mb-2">
                <Logo size="xl" />
                <div className="text-right mt-auto">
                  <p className="text-[9px] font-bold">Cabang</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest leading-tight">
                    {batch.outlet?.label ||
                      batch.outlet?.name ||
                      'Central Kitchen'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-start">
                  <p className="text-[14px] font-bold leading-none">
                    {batch.product?.name}
                  </p>
                  <p className="text-[9px] font-bold font-mono text-gray-800">
                    {batch.batchNumber}
                  </p>
                </div>
                <p className="text-[8px] font-bold uppercase text-gray-400">
                  Produced: {dayjs(batch.plannedDate).format('DD/MM/YY')}
                </p>
              </div>
              <div className="flex justify-between items-end pt-2 border-t border-dashed border-black">
                <div>
                  <p className="text-[8px] font-medium text-gray-500">
                    Quantity
                  </p>
                  <p className="text-sm font-bold">
                    {batch.actualQty} {batch.product?.outputUnit}
                  </p>
                </div>
                <div className="bg-black text-white px-2 py-1 flex flex-col items-center rounded-sm">
                  <span className="text-[6px] font-bold">BATCH ID</span>
                  <span className="text-[8px] font-bold font-mono">
                    {batch.batchNumber}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* PRODUCTION BATCH SHEET (WORK ORDER) */
            <div className="doc-container">
              <div className="doc-header">
                <div className="flex flex-col gap-1 mt-5">
                  <Logo size="xxxl" />
                </div>
                <div className="text-right">
                  <h1 className="text-2xl font-bold uppercase">
                    WORK ORDER / BATCH SHEET
                  </h1>
                  <p className="text-sm font-bold font-mono">
                    #{batch.batchNumber}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6 border-b pb-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase text-gray-500">
                    Product to Produce:
                  </p>
                  <p className="text-2xl font-bold">{batch.product?.name}</p>
                  <p className="text-sm font-bold text-gray-400 uppercase">
                    Recipe Version: v{batch.recipeVersion?.versionNumber}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-semibold uppercase text-gray-500">
                    Production Output:
                  </p>
                  <p className="text-2xl font-bold">
                    {batch.actualQty} {batch.product?.outputUnit}
                  </p>
                  <p className="text-sm font-bold text-gray-400">
                    Date: {dayjs(batch.plannedDate).format('DD MMMM YYYY')}
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest border-l-4 border-black pl-3 mb-4 italic">
                  Preparation & Ingredients List
                </h3>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th className="text-left w-12">No</th>
                      <th className="text-left">Ingredient Name</th>
                      <th className="text-right w-36">Req. Quantity</th>
                      <th className="text-center w-24">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.materialUsages?.map((usage, idx) => (
                      <tr key={usage._id}>
                        <td className="w-12">{idx + 1}</td>
                        <td className="font-bold">
                          {usage.material?.name}
                          {usage.material?.brand && (
                            <span className="text-gray-500 font-normal ml-1">
                              ({usage.material.brand})
                            </span>
                          )}
                        </td>
                        <td className="text-right w-36">{usage.plannedQty}</td>
                        <td className="text-center w-24">{usage.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-bold uppercase mb-3 italic">
                  Notes / Catatan:
                </h3>
                <div className="space-y-4">
                  <div className="border-b border-black border-dashed h-5 w-full"></div>
                  <div className="border-b border-black border-dashed h-5 w-full"></div>
                  <div className="border-b border-black border-dashed h-5 w-full"></div>
                </div>
              </div>

              <div className="mb-8 p-4 border-2 border-black">
                <h3 className="text-xs font-bold uppercase mb-2 italic underline">
                  Special Instructions:
                </h3>
                <p className="text-sm font-medium">
                  {batch.notes ||
                    'Handle with care. Follow SOP for sanitation and safety.'}
                </p>
              </div>

              <div className="signature-grid">
                <div className="sig-box">Kitchen Manager</div>
                <div className="sig-box">Head Chef</div>
                <div className="sig-box">Quality Control</div>
              </div>
            </div>
          )}
        </div>
        <DialogHeader className="pt-6 px-6 shrink-0 border-b border-gray-100 pb-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 font-bold text-[10px] tracking-widest uppercase border-gray-200 text-gray-500"
                >
                  Batch ID: {batch.batchNumber}
                </Badge>
                <Badge
                  className={cn(
                    'rounded-full px-3 py-1 font-bold text-[10px] tracking-widest uppercase border-none',
                    batch.status === 'completed'
                      ? 'bg-green-600 text-white'
                      : batch.status === 'in_progress'
                        ? 'bg-blue-600 text-white'
                        : batch.status === 'cancelled'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-600 text-white'
                  )}
                >
                  {batch.status}
                </Badge>
              </div>
              <DialogTitle className="text-3xl font-bold tracking-tight text-gray-900">
                {batch.product?.name}
              </DialogTitle>
              <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-2">
                Recipe Version {batch.recipeVersion?.versionNumber}{' '}
                <span className="h-1 w-1 rounded-full bg-gray-300" /> Planned
                for {dayjs(batch.plannedDate).format('DD MMMM YYYY')}
              </p>
            </div>

            <div className="flex items-center gap-2 mr-8">
              <Button
                variant="outline"
                onClick={() => handlePrint('label')}
                icon={Printer}
              >
                Cetak Label
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePrint('sheet')}
                icon={Printer}
                isLoading={!fullBatchData}
              >
                Work Order
              </Button>
              {view === 'details' && batch.status === 'in_progress' && (
                <Button
                  onClick={() => setView('complete')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-sm gap-2 shadow-lg shadow-green-100 h-12 px-6"
                >
                  <CheckCircle2 className="w-5 h-5" /> Complete Batch
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {!fullBatchData ? (
            <LoadingSpinner fullScreen={false} text="Memuat detail batch..." />
          ) : view === 'details' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Production Output',
                    val: batch.actualQty,
                    unit: batch.product?.outputUnit,
                    icon: Package,
                    color: 'text-gray-600'
                  },
                  {
                    label: 'Actual Output',
                    val: batch.actualQty || '-',
                    unit: batch.product?.outputUnit,
                    icon: TrendingUp,
                    color: 'text-blue-600'
                  },
                  {
                    label: 'Total Batch Cost',
                    val: batch.totalCost ? toIDR(batch.totalCost) : 'N/A',
                    icon: Coins,
                    color: 'text-orange-600'
                  },
                  {
                    label: 'Unit Production Cost',
                    val: batch.unitCost ? toIDR(batch.unitCost) : 'N/A',
                    icon: Calculator,
                    color: 'text-purple-600'
                  }
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-gray-50/50 border border-gray-100 p-4 rounded-sm flex flex-col items-center justify-center text-center"
                  >
                    <item.icon
                      className={cn('w-5 h-5 mb-2 opacity-50', item.color)}
                    />
                    <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-tight mb-1">
                      {item.label}
                    </p>
                    <p
                      className={cn(
                        'text-lg font-bold tracking-tight',
                        item.val !== '-' ? 'text-gray-900' : 'text-gray-300'
                      )}
                    >
                      {item.val}{' '}
                      {item.unit && (
                        <span className="text-[10px] uppercase">
                          {item.unit}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1 border-b pb-4 border-gray-50">
                  <ChefHat className="w-5 h-5 text-gray-400" />
                  <h3 className="font-bold text-gray-800 uppercase tracking-wider text-xs">
                    Planned Ingredients
                  </h3>
                </div>
                <div className="border border-gray-50 rounded-sm overflow-hidden shadow-sm">
                  <Table containerClassName="h-auto" className="w-full">
                    <TableHeader className="bg-gray-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-xs uppercase py-4">
                          Material
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase text-right">
                          Planned Usage
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase text-right">
                          Last Price (Snapshot)
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase text-right">
                          Estimated Cost
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batch.materialUsages?.map((usage) => (
                        <TableRow key={usage._id} className="border-gray-50">
                          <TableCell className="font-bold text-gray-700">
                            {usage.material?.name}
                            {usage.material?.brand && (
                              <span className="text-gray-500 font-normal ml-1">
                                ({usage.material.brand})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold">
                              {usage.plannedQty}
                            </span>{' '}
                            <span className="text-[10px] text-gray-400">
                              {usage.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-gray-400 text-xs">
                            Rp{' '}
                            {new Intl.NumberFormat('id-ID').format(
                              usage.unitCost
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-orange-600">
                            Rp{' '}
                            {new Intl.NumberFormat('id-ID').format(
                              usage.plannedQty * usage.unitCost
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {batch?.notes && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-sm border-l-4 border-l-blue-500">
                  <p className="text-[10px] font-bold uppercase text-blue-400 tracking-tight mb-1">
                    Production Guidelines
                  </p>
                  <p className="text-sm font-semibold text-blue-900 leading-relaxed italic">
                    {`"${batch.notes}"`}
                  </p>
                </div>
              )}

              {/* History Section */}
              <HistoryLogTable
                title="Batch History"
                histories={(batch.histories || []).map((h) => ({
                  id: h._id,
                  action: h.action,
                  changes: h.changes,
                  createdAt: h.createdAt,
                  performerName: h.performer?.name,
                  performerRole: h.performer?.positionDoc?.title
                }))}
              />
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onCompleteSubmit)}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Costing Inputs */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Actual Output */}
                  <div className="bg-white p-6 rounded-sm border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b pb-4">
                      <Package className="w-5 h-5 text-blue-500" />
                      <h3 className="font-bold text-gray-800">
                        Final Realization
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 ml-1">
                          Actual Produced Qty ({batch.product?.outputUnit})
                        </Label>
                        <FormInput
                          form={form}
                          name="actualQty"
                          type="number"
                          min={0.001}
                          step="any"
                          className="h-12 font-bold text-xl text-blue-600 bg-blue-50/30 border-blue-100"
                          containerClassName="mb-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 ml-1">
                          Batch Note / Deviation Reason
                        </Label>
                        <FormInput
                          form={form}
                          name="notes"
                          placeholder="Optional notes for this batch..."
                          className="h-12"
                          containerClassName="mb-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Material Adjustment */}
                  <div className="bg-white p-6 rounded-sm border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-4">
                      <div className="flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-orange-500" />
                        <h3 className="font-bold text-gray-800">
                          Material Usage Adjustment
                        </h3>
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        Snapshot Price Used
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {batch.materialUsages?.map((usage, idx) => (
                        <div
                          key={usage._id}
                          className="flex items-center gap-4 p-3 bg-gray-50/50 rounded-sm border border-gray-100 transition-all hover:bg-white hover:border-blue-200"
                        >
                          <div className="flex-1">
                            <p className="font-bold text-gray-800 leading-none">
                              {usage.material?.name}
                              {usage.material?.brand && (
                                <span className="text-gray-500 font-normal ml-1">
                                  ({usage.material.brand})
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-tight">
                              Planned: {usage.plannedQty} {usage.unit}
                            </span>
                          </div>
                          <div className="w-32">
                            <Label className="text-[10px] font-bold text-gray-500 block mb-1">
                              Actual Usage
                            </Label>
                            <div className="relative">
                              <FormInput
                                form={form}
                                name={`materialUsages.${idx}.actualQty`}
                                type="number"
                                min={0}
                                step="any"
                                className="h-10 text-right pr-12 font-bold"
                                containerClassName="mb-0"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300">
                                {usage.unit}
                              </span>
                            </div>
                          </div>
                          <div className="w-32 text-right">
                            <p className="text-[10px] font-bold uppercase text-gray-300 mb-1">
                              Cost Impact
                            </p>
                            <p className="font-semibold text-orange-600">
                              Rp{' '}
                              {new Intl.NumberFormat('id-ID').format(
                                (watchAll.materialUsages?.[idx]?.actualQty ||
                                  0) * usage.unitCost
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Proportional Cost Section */}
                  <div className="bg-white p-6 rounded-sm border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-4">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-gray-800">
                          Proportional HPP Cost
                        </h3>
                      </div>
                      {!monthlyHPP && (
                        <Badge variant="destructive" className="font-bold">
                          HPP Bulanan Belum Diinput
                        </Badge>
                      )}
                    </div>
                    {monthlyHPP ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                          <p className="text-[10px] font-bold uppercase text-indigo-400 mb-1 tracking-wider">
                            Proporsional Upah Karyawan
                          </p>
                          <p className="font-bold text-xl text-indigo-900">
                            Rp{' '}
                            {new Intl.NumberFormat('id-ID').format(
                              summary.laborCost
                            )}
                          </p>
                          <p className="text-[9px] font-semibold text-indigo-400 mt-1">
                            Otomatis terhitung dari rasio HPP bulan ini
                          </p>
                        </div>
                        <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                          <p className="text-[10px] font-bold uppercase text-indigo-400 mb-1 tracking-wider">
                            Proporsional Overhead Cost
                          </p>
                          <p className="font-bold text-xl text-indigo-900">
                            Rp{' '}
                            {new Intl.NumberFormat('id-ID').format(
                              summary.overheadCost
                            )}
                          </p>
                          <p className="text-[9px] font-bold text-indigo-400 mt-1">
                            Otomatis terhitung dari rasio HPP bulan ini
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-red-50 text-red-600 rounded-lg text-center text-sm font-bold border border-red-100">
                        Harap input HPP Bulanan pada menu Input HPP untuk bulan
                        berjalan ini, agar sistem dapat menghitung proporsi
                        biaya produksi otomatis.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Summary Stickiness */}
                <div className="space-y-6">
                  <div className="bg-gray-900 text-white rounded-sm-[2rem] p-8 shadow-2xl sticky top-4 border-4 border-gray-800">
                    <div className="flex items-center gap-3 border-b border-gray-800 pb-6 mb-6">
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <History className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">
                          Live Costing Summary
                        </h4>
                        <h2 className="text-2xl font-bold italic tracking-tighter">
                          Manufacturing Report
                        </h2>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center group">
                        <span className="text-gray-400 text-xs font-semibold uppercase group-hover:text-white transition-colors">
                          Materials
                        </span>
                        <span className="font-semibold text-lg">
                          Rp{' '}
                          {new Intl.NumberFormat('id-ID').format(
                            summary.matCost
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="text-gray-400 text-xs font-semibold uppercase group-hover:text-white transition-colors">
                          Labor
                        </span>
                        <span className="font-semibold text-lg">
                          Rp{' '}
                          {new Intl.NumberFormat('id-ID').format(
                            summary.laborCost
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center group border-b border-gray-800 pb-6">
                        <span className="text-gray-400 text-xs font-semibold uppercase group-hover:text-white transition-colors">
                          Overhead
                        </span>
                        <span className="font-semibold text-lg">
                          Rp{' '}
                          {new Intl.NumberFormat('id-ID').format(
                            summary.overheadCost
                          )}
                        </span>
                      </div>

                      <div className="pt-2 text-center space-y-4">
                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-400">
                          Total Production Cost
                        </p>
                        <h3 className="text-4xl font-semibold tracking-tighter text-blue-50">
                          Rp{' '}
                          {new Intl.NumberFormat('id-ID').format(summary.total)}
                        </h3>

                        <div className="bg-blue-600/10 rounded-sm p-4 border border-blue-600/20">
                          <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">
                            Unit HPP Estimate
                          </p>
                          <p className="text-2xl font-semibold tracking-tighter text-white">
                            Rp{' '}
                            {new Intl.NumberFormat('id-ID').format(
                              summary.unitCost
                            )}{' '}
                            <span className="text-[10px] uppercase text-blue-300">
                              / {batch.product?.outputUnit}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 space-y-3">
                      <Button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-sm shadow-xl shadow-blue-950/50 gap-3"
                      >
                        {isProcessing ? (
                          'POSTING...'
                        ) : (
                          <>
                            <CheckCircle2 className="w-6 h-6" /> POST FINAL
                            BATCH
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setView('details')}
                        className="w-full text-gray-500 hover:text-white hover:bg-white/5 font-bold h-10 rounded-sm"
                      >
                        Cancel Realization
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-sm flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
                    <p className="text-[10px] text-orange-800 font-bold leading-relaxed">
                      IMPORTANT: Finalizing this batch will permanently deduct
                      stock from inventory based on &quot;Actual Usage&quot; and
                      lock this recipe version.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        <DialogFooter className="border-t border-gray-100 p-4 bg-gray-50 shrink-0 flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            {(batch.status === 'planned' || batch.status === 'in_progress') && (
              <>
                <Button
                  variant="outline"
                  className="rounded-sm font-bold border-red-100 text-red-600 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={isProcessing}
                >
                  Cancel Batch
                </Button>
                <Button
                  onClick={handleStart}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm gap-2 px-8 shadow-lg shadow-blue-100"
                >
                  <Play className="w-4 h-4" /> Start Production Now
                </Button>
              </>
            )}
          </div>
          <Button
            variant="outline"
            className="rounded-sm font-bold md:ml-auto"
            onClick={() => handleOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
