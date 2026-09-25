'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import api from '@/lib/api/api';
import { FormInput } from '@/components/ui/form-input';
import { RTUProduct } from '@/lib/type/rtu_product';
import { Authorized } from '@/components/ui/authorized';
import { UnitSelect } from '@/components/ui/unit-select';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { useGetRTUCategories } from '@/lib/hooks/queries/rtu-category';
import { ImageUpload } from '@/components/ui/image-upload';
import { MultiUnitSection } from '@/components/shared/multi-unit-section';
import { ReusableSelect } from '@/components/ui/reusable-select';

const formSchema = z.object({
  code: z.string().min(1, 'Code required'),
  name: z.string().min(1, 'Name required'),
  category: z.string().optional(),
  outputUnit: z.string().min(1, 'Unit required'),
  minStock: z.coerce.number().min(0, 'Must be positive').default(0),
  minStockInput: z.coerce.number().min(0, 'Must be positive').default(0),
  minStockUnit: z.string().optional(),
  description: z.string().optional(),
  barcode: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean(),
  units: z
    .array(
      z.object({
        unitName: z.string().min(1, 'Required'),
        relativeConversion: z.preprocess((val) => {
          if (typeof val === 'string') {
            const normalized = val.replace(',', '.');
            const parsed = parseFloat(normalized);
            return isNaN(parsed) ? val : parsed;
          }
          return val;
        }, z.number().min(0.000001, 'Must be positive').default(1)),
        relativeToUnit: z.string().optional(),
        conversion: z.coerce.number().default(0), // final to base, calculated auto
        barcode: z.string().optional()
      })
    )
    .default([])
});

export function EditProductDialog({ product }: { product: RTUProduct }) {
  const { hasPermission: canUpdate } = useGetPermission('update');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { data: categoryData } = useGetRTUCategories('', true);

  // Try to find the largest unit that cleanly divides minStock
  const baseUnit = product.outputUnit || '';
  const units = product.units || [];

  let initialMinStockInput = product.minStock || 0;
  let initialMinStockUnit = baseUnit;

  const sortedUnits = [...units].sort(
    (a, b) => (b.conversion || 0) - (a.conversion || 0)
  );
  for (const u of sortedUnits) {
    if (u.unitName && u.conversion > 0) {
      const divided = (product.minStock || 0) / u.conversion;
      if (Math.abs(divided - Math.round(divided)) < 0.0001) {
        initialMinStockInput = Math.round(divided);
        initialMinStockUnit = u.unitName;
        break;
      }
    }
  }

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: product.code,
      name: product.name,
      category: product.category || '',
      outputUnit: baseUnit,
      minStock: product.minStock,
      minStockInput: initialMinStockInput,
      minStockUnit: initialMinStockUnit,
      description: product.description || '',
      barcode: product.barcode || '',
      imageUrl: product.imageUrl || '',
      isActive: product.isActive,
      units:
        units.map((u) => ({
          unitName: u.unitName,
          relativeConversion: u.relativeConversion ?? u.conversion,
          relativeToUnit: u.relativeToUnit || '',
          conversion: u.conversion,
          barcode: u.barcode || ''
        })) || []
    }
  });

  const outputUnit = form.watch('outputUnit');
  const minStockUnit = form.watch('minStockUnit');

  const currentUnits = useWatch({
    control: form.control,
    name: 'units',
    defaultValue: []
  });

  // Sync minStockUnit if base unit changes for the first time
  useEffect(() => {
    if (outputUnit && !minStockUnit) {
      form.setValue('minStockUnit', outputUnit);
    }
  }, [outputUnit, minStockUnit, form]);

  const minStockUnitOptions = useMemo(() => {
    const opts = [{ label: outputUnit || 'Unit', value: outputUnit || '' }];
    currentUnits.forEach((u: any) => {
      if (u.unitName) {
        opts.push({ label: u.unitName, value: u.unitName });
      }
    });
    return opts;
  }, [outputUnit, currentUnits]);

  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);

      let finalMinStock = Number(values.minStockInput) || 0;
      const selectedUnitName = values.minStockUnit;
      if (selectedUnitName && selectedUnitName !== values.outputUnit) {
        const matchedUnit = values.units?.find(
          (u: any) => u.unitName === selectedUnitName
        );
        if (matchedUnit) {
          finalMinStock = finalMinStock * (matchedUnit.conversion || 1);
        }
      }

      await api.put(`/rtu/product/${product._id}`, {
        ...values,
        minStock: finalMinStock
      });
      queryClient.invalidateQueries({ queryKey: ['rtu-products'] });
      toast.success('Produk berhasil diupdate');
      setOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal update Produk');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canUpdate) return null;

  return (
    <Authorized action="update">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
          >
            <Edit className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-sm p-0 shadow-xl border-t-4 border-blue-500 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-800">
              Edit Profil Produk Master
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput form={form} name="code" label="Kode Produk *" />
                <FormInput
                  form={form}
                  name="name"
                  label="Nama Produk Akhir *"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <UnitSelect
                  form={form}
                  name="outputUnit"
                  label="Satuan Dasar Output / Yield *"
                />
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium leading-none text-gray-700">
                    Kategori
                  </label>
                  <ReusableSelect
                    showDefaultSelect
                    options={
                      categoryData?.data?.map((c: any) => ({
                        label: c.name,
                        value: c.name
                      })) || []
                    }
                    value={form.watch('category')}
                    onChange={(val) => {
                      form.setValue('category', val, {
                        shouldValidate: true,
                        shouldDirty: true
                      });
                    }}
                    placeholder="Pilih Kategori..."
                  />
                </div>
              </div>

              <FormInput
                form={form}
                name="description"
                label="Deskripsi / Kegunaan"
                rows={2}
              />

              <ImageUpload
                value={form.watch('imageUrl')}
                onChange={(url) => form.setValue('imageUrl', url)}
              />

              {/* MULTI SATUAN SECTION */}
              <MultiUnitSection
                form={form}
                baseUnitFieldName="outputUnit"
                showConversionPreview={true}
              />

              {/* MINIMUM STOCK SECTION */}
              <div className="bg-white p-4 border border-gray-200 rounded-sm space-y-2 mt-4 shadow-sm">
                <label className="text-sm font-bold text-gray-700 block">
                  Minimum Stock Alert *
                </label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <FormInput
                      form={form}
                      name="minStockInput"
                      type="number"
                      placeholder="Masukkan jumlah stok minimum..."
                      containerClassName="mb-0"
                    />
                  </div>
                  <div className="w-48">
                    <ReusableSelect
                      showDefaultSelect={false}
                      options={minStockUnitOptions}
                      value={form.watch('minStockUnit')}
                      onChange={(val) => {
                        form.setValue('minStockUnit', val, {
                          shouldDirty: true
                        });
                      }}
                      placeholder="Pilih Satuan..."
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Sistem akan memunculkan peringatan jika sisa stok di outlet
                  kurang dari nilai ini.
                  {form.watch('minStockUnit') !== form.watch('outputUnit') && (
                    <span className="text-emerald-600 block mt-0.5 font-semibold">
                      * Ekuivalen dengan{' '}
                      <b>
                        {(
                          Number(form.watch('minStockInput') || 0) *
                          (form
                            .watch('units')
                            ?.find(
                              (u: any) =>
                                u.unitName === form.watch('minStockUnit')
                            )?.conversion || 1)
                        ).toLocaleString('id-ID', {
                          maximumFractionDigits: 6
                        })}{' '}
                        {form.watch('outputUnit')}
                      </b>{' '}
                      (Satuan Dasar).
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center space-x-2 mt-4 bg-gray-50 p-3 rounded-sm border border-gray-100">
                <input
                  type="checkbox"
                  id={'isActiveProduct-' + product._id}
                  {...form.register('isActive')}
                  className="rounded-sm text-brand-500 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor={'isActiveProduct-' + product._id}
                  className="text-sm font-medium cursor-pointer text-gray-700"
                >
                  Produk Aktif / Masih Diproduksi
                </label>
              </div>
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3 z-10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Batal
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                className="bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
              >
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Authorized>
  );
}
