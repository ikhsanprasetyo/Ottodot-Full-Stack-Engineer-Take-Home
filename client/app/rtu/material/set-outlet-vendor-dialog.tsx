'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import api from '@/lib/api/api';
import { RTUMaterial } from '@/lib/type/rtu_material';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';

const formSchema = z.object({
  vendorId: z.string().min(1, 'Vendor wajib dipilih'),
  outletId: z
    .string()
    .min(
      1,
      'Outlet wajib dipilih (Silakan pilih outlet di filter tabel terlebih dahulu)'
    )
});

export function SetOutletVendorDialog({
  material,
  defaultOutletId
}: {
  material: RTUMaterial;
  defaultOutletId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { data: vendorsData } = useGetRTUVendors('', true);
  const vendors = vendorsData?.data || [];

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: '',
      outletId: defaultOutletId || ''
    }
  });

  // Update outletId when defaultOutletId changes or dialog opens
  const onOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      form.setValue('outletId', defaultOutletId || '');
    }
  };

  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      await api.post(`/rtu/material/outlet-vendor`, {
        materialId: material._id,
        outletId: values.outletId,
        vendorId: values.vendorId
      });

      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      toast.success(`Vendor preferensi untuk outlet berhasil disimpan!`);
      setOpen(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Gagal menyimpan mapping vendor'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          title="Mapping Vendor per Outlet"
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <UserCog className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white rounded-sm p-6 shadow-xl border-t-4 border-blue-500">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Mapping Vendor Lokasi
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-1">
            Tentukan supplier spesifik untuk item <b>{material.name}</b> di
            outlet yang dipilih.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 py-4 mt-2"
        >
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium leading-none text-gray-700">
              Outlet Target *
            </label>
            <input
              readOnly
              disabled
              value={defaultOutletId || 'Pilih outlet di filter utama dahulu'}
              className="flex h-10 w-full rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
            {form.formState.errors.outletId && (
              <p className="text-xs text-red-500">
                {form.formState.errors.outletId.message as string}
              </p>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium leading-none text-gray-700">
              Pilih Vendor Preferensi *
            </label>
            <select
              {...form.register('vendorId')}
              className="flex h-10 w-full rounded-sm border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">-- Pilih Supplier --</option>
              {vendors.map((v: any) => (
                <option key={v._id} value={v._id}>
                  [{v.code}] {v.name}
                </option>
              ))}
            </select>
            {form.formState.errors.vendorId && (
              <p className="text-xs text-red-500">
                {form.formState.errors.vendorId.message as string}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t mt-6 border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-gray-600"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !defaultOutletId}
              className="bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm text-white md:w-32"
            >
              {isLoading ? 'Simpan...' : 'Simpan Mapping'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
