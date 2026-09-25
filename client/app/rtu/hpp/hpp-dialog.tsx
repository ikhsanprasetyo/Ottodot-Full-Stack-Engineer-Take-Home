'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import dayjs from 'dayjs';
import { Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MonthPicker } from '@/components/shared/month-picker';
import { FormInput } from '@/components/ui/form-input';
import { OutletSelector } from '@/components/shared/outlet-selector';
import api from '@/lib/api/api';
import { useGetRTUMonthlyHPP } from '@/lib/hooks/queries/rtu-hpp';
import { formatFullIDR } from '@/lib/number';

const hppSchema = z.object({
  outletId: z.string().min(1, 'Outlet is required'),
  monthYear: z.string().min(1, 'Month Year is required'),
  totalLaborCost: z.coerce.number().min(0),
  totalOverheadCost: z.coerce.number().min(0)
});

type HPPFormValues = z.infer<typeof hppSchema>;

interface HppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
  initialMonthYear?: string; // If provided, it's edit mode
}

export function HppDialog({
  open,
  onOpenChange,
  outletId,
  initialMonthYear
}: HppDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonthYear || dayjs().format('YYYY-MM')
  );

  const form = useForm<HPPFormValues>({
    resolver: zodResolver(hppSchema) as any,
    defaultValues: {
      outletId: outletId,
      monthYear: selectedMonth,
      totalLaborCost: 0,
      totalOverheadCost: 0
    }
  });

  const { watch, reset, handleSubmit } = form;
  const currentOutletId = watch('outletId');

  const { data: hppData, isLoading } = useGetRTUMonthlyHPP(
    currentOutletId,
    selectedMonth
  );

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      const month = initialMonthYear || dayjs().format('YYYY-MM');
      setSelectedMonth(month);
      reset({
        outletId: outletId,
        monthYear: month,
        totalLaborCost: 0,
        totalOverheadCost: 0
      });
    }
  }, [open, initialMonthYear, outletId, reset]);

  // Update form costs only when fetched data changes
  useEffect(() => {
    if (open && hppData) {
      if (hppData.data) {
        form.setValue('totalLaborCost', hppData.data.totalLaborCost || 0);
        form.setValue('totalOverheadCost', hppData.data.totalOverheadCost || 0);
      } else {
        form.setValue('totalLaborCost', 0);
        form.setValue('totalOverheadCost', 0);
      }
    }
  }, [hppData, open, form]);

  const onSubmit = async (data: HPPFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/rtu/hpp', data);
      toast.success('HPP Bulan ini berhasil disimpan!');
      queryClient.invalidateQueries({
        queryKey: ['rtu-monthly-hpp-all', outletId]
      });
      queryClient.invalidateQueries({
        queryKey: ['rtu-monthly-hpp', outletId, data.monthYear]
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan HPP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchLabor = watch('totalLaborCost') || 0;
  const watchOverhead = watch('totalOverheadCost') || 0;
  const total = watchLabor + watchOverhead;
  const isEditMode = !!initialMonthYear;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Edit HPP Bulanan' : 'Tambah HPP Bulanan'}
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-gray-500">
            Masukkan total biaya operasional cabang Anda dalam 1 bulan penuh.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-1">
              <OutletSelector
                value={currentOutletId}
                onSelect={(val) => form.setValue('outletId', val)}
                disabled={isEditMode}
              />
            </div>
            <MonthPicker
              value={selectedMonth}
              onChange={(val) => {
                setSelectedMonth(val);
                form.setValue('monthYear', val);
              }}
              label="Bulan & Tahun"
              className="w-full"
              inputClassName="w-full"
              useLabelComponent={true}
              disabled={isEditMode} // Cannot change month in edit mode
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 ml-1">
                Total Biaya Upah Karyawan
              </Label>
              <FormInput
                form={form}
                name="totalLaborCost"
                type="number"
                min={0}
                step="any"
                isCurrency={true}
                className="h-12 font-bold text-lg bg-blue-50/50 focus:bg-white"
                placeholder="0"
              />
              <p className="text-[10px] font-bold text-blue-600">
                Total upah (termasuk kitchen) sebulan
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 ml-1">
                Total Biaya Overhead
              </Label>
              <FormInput
                form={form}
                name="totalOverheadCost"
                type="number"
                min={0}
                step="any"
                isCurrency={true}
                className="h-12 font-bold text-lg bg-purple-50/50 focus:bg-white"
                placeholder="0"
              />
              <p className="text-[10px] font-bold text-purple-600">
                Listrik, gas, air, maintenance sebulan
              </p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-5 text-white flex flex-col items-center justify-center text-center">
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">
              Estimasi Total Pengeluaran
            </p>
            <h2 className="text-2xl font-bold text-green-400">
              {formatFullIDR(total)}
            </h2>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-orange-800 leading-relaxed">
                Sistem akan secara otomatis menghitung proporsi biaya Upah &
                Overhead untuk setiap Batch Produksi harian Anda di bulan ini.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full md:w-auto rounded-sm font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting || isLoading}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white rounded-sm font-bold"
            >
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
