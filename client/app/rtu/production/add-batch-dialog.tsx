'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, LayoutPanelTop, Info, Package, Boxes } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { DatePicker } from '@/components/ui/date-picker';
import api from '@/lib/api/api';
import { useGetRTUProducts } from '@/lib/hooks/queries/rtu-product';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { FormInput } from '@/components/ui/form-input';
import dayjs from 'dayjs';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { round } from '@/lib/number';
import { cn } from '@/lib/utils';

const batchSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  outletId: z.string().min(1, 'Outlet is required'),
  actualQty: z.coerce.number().min(0.1, 'Quantity must be greater than 0'),
  plannedDate: z.string().min(1, 'Planned date is required'),
  notes: z.string().optional(),
  materialUsages: z
    .array(
      z.object({
        recipeIngredientId: z.string(),
        materialId: z.string()
      })
    )
    .optional()
});

type BatchFormValues = z.infer<typeof batchSchema>;

export function AddBatchDialog() {
  const { hasPermission: canCreate } = useGetPermission('create');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema) as any,
    defaultValues: {
      productId: '',
      plannedDate: dayjs().format('YYYY-MM-DD'),
      outletId:
        typeof window !== 'undefined' ? getUserFromStorage()?.outlet || '' : '',
      actualQty: 1,
      notes: ''
    }
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = form;

  const selectedProductId = watch('productId');
  const selectedOutletId = watch('outletId');
  const actualQtyInput = watch('actualQty');
  const materialUsages = watch('materialUsages') || [];

  const { data: productsData } = useGetRTUProducts('', true);
  const { data: materialsData } = useGetRTUMaterials(
    '',
    true,
    undefined,
    selectedOutletId
  );

  const productOptions = useMemo(
    () =>
      (productsData?.data || []).map((p: any) => ({
        value: p._id,
        label: `${p.code} - ${p.name}`
      })),
    [productsData]
  );

  const selectedProduct = useMemo(
    () => productsData?.data?.find((p: any) => p._id === selectedProductId),
    [productsData, selectedProductId]
  );

  const activeRecipeVersion = useMemo(() => {
    return selectedProduct?.recipe?.versions?.find(
      (v: any) => v.status === 'active'
    );
  }, [selectedProduct]);

  const scaleFactor = useMemo(() => {
    const qtyNum = Number(actualQtyInput);
    const actualQtyVal = isNaN(qtyNum) || qtyNum <= 0 ? 0 : qtyNum;
    const expectedOutput = Number(activeRecipeVersion?.expectedOutput) || 1;
    if (expectedOutput > 0 && actualQtyVal > 0) {
      return actualQtyVal / expectedOutput;
    }
    return actualQtyVal || 1;
  }, [actualQtyInput, activeRecipeVersion]);

  const handleMaterialUsageChange = (
    recipeIngredientId: string,
    materialId: string
  ) => {
    const existing = [...materialUsages];
    const index = existing.findIndex(
      (m) => m.recipeIngredientId === recipeIngredientId
    );
    if (index >= 0) {
      existing[index] = { ...existing[index], materialId };
    } else {
      existing.push({ recipeIngredientId, materialId });
    }
    setValue('materialUsages', existing, { shouldValidate: false });
  };

  const onSubmit = async (data: BatchFormValues) => {
    if (!selectedProduct?.recipe?._id) {
      toast.error('Product does not have a recipe. Please setup recipe first.');
      return;
    }

    const activeVersion = selectedProduct.recipe.versions?.find(
      (v: any) => v.status === 'active'
    );

    if (!activeVersion) {
      toast.error('No active recipe version found for this product.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/rtu/batch', {
        ...data,
        plannedDate: new Date(data.plannedDate).toISOString(),
        recipeVersionId: activeVersion._id,
        materialUsages: data.materialUsages
      });
      toast.success('Product added successfully');
      queryClient.invalidateQueries({ queryKey: ['rtu-production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-products'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-stock-ledgers'] });
      setOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to plan batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="primary"
          className="bg-orange-600 hover:bg-orange-700"
          icon={Plus}
        >
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] rounded-sm border-none shadow-2xl flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900 border-b pb-4">
            <LayoutPanelTop className="w-6 h-6 text-orange-500" />
            Add Product
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-5 pt-4 pb-2">
              {/* Row 1: Cabang + Tanggal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OutletSelector
                  value={watch('outletId')}
                  onSelect={(val) => setValue('outletId', val)}
                  label="Cabang"
                  required
                />

                <div className="space-y-1">
                  <DatePicker
                    label="Tanggal Produksi"
                    value={watch('plannedDate')}
                    onChange={(date) =>
                      setValue('plannedDate', date, { shouldValidate: true })
                    }
                  />
                  {errors.plannedDate && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.plannedDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Product to Produce + Qty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="font-bold text-gray-700 flex items-center gap-2 mb-1 ml-1">
                    Product to Produce
                    {selectedProduct && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase rounded-sm"
                      >
                        {selectedProduct.category}
                      </Badge>
                    )}
                  </Label>
                  <ReusableSelect
                    options={productOptions}
                    value={selectedProductId || ''}
                    onChange={(val) => setValue('productId', val as string)}
                    placeholder="Select Product..."
                    searchable={true}
                    className="h-11"
                  />
                  {errors.productId && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.productId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="font-bold text-gray-700 mb-1 ml-1">
                    Kuantitas Produksi (Qty)
                  </Label>
                  <div className="relative">
                    <FormInput
                      form={form}
                      name="actualQty"
                      type="number"
                      min={0.1}
                      step="any"
                      className="h-11 font-bold pl-10 bg-white"
                      containerClassName="mb-0"
                    />
                    <Package className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    {selectedProduct && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        {selectedProduct.outputUnit}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedProduct && !selectedProduct.recipe && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-sm flex gap-2 items-center text-red-600 text-xs font-bold">
                  <Info className="w-4 h-4 shrink-0" />
                  This product has no recipe defined. You cannot start
                  production.
                </div>
              )}

              <div className="space-y-1">
                <Label className="font-bold text-gray-700 mb-1 ml-1">
                  Notes (Optional)
                </Label>
                <Input
                  {...register('notes')}
                  placeholder="Instructions for the kitchen team..."
                  className="h-11 rounded-sm"
                />
              </div>
            </div>

            {selectedProduct?.recipe && (
              <div className="p-4 bg-orange-50/60 border border-orange-200/70 rounded-sm space-y-3">
                <div className="flex items-center justify-between border-b border-orange-200/50 pb-2">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-orange-600 shrink-0" />
                    <p className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                      Kebutuhan Bahan Baku
                    </p>
                  </div>
                  <span className="text-[11px] text-orange-700 font-medium bg-orange-100/80 px-2 py-0.5 rounded-sm">
                    Total Estimasi Form
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  {activeRecipeVersion?.ingredients?.map((ing: any) => {
                    const primaryMat = materialsData?.data?.find(
                      (m: any) => m._id === ing.materialId
                    );

                    const selectedMatId =
                      materialUsages.find(
                        (m: any) => m.recipeIngredientId === ing._id
                      )?.materialId || ing.materialId;

                    const selectedMat =
                      materialsData?.data?.find(
                        (m: any) => m._id === selectedMatId
                      ) || primaryMat;

                    const baseQty = Number(ing.qty) || 0;
                    const calculatedQty = round(baseQty * scaleFactor, 4);
                    const currentStock = round(
                      selectedMat?.currentStock || 0,
                      4
                    );
                    const isStockInsufficient = currentStock < calculatedQty;

                    // Collect options (Primary + Alternatives) with stock info
                    const matOptions = [
                      {
                        value: ing.materialId,
                        label: primaryMat?.brand
                          ? `${primaryMat.name} [Merek: ${primaryMat.brand}] (Stok: ${round(primaryMat.currentStock || 0, 2)} ${primaryMat.unit}) (Primary)`
                          : `${primaryMat?.name || 'Unknown'} (Stok: ${round(primaryMat?.currentStock || 0, 2)} ${primaryMat?.unit || ing.unit}) (Primary)`
                      }
                    ];

                    if (
                      ing.alternativeMaterialIds &&
                      Array.isArray(ing.alternativeMaterialIds)
                    ) {
                      ing.alternativeMaterialIds.forEach((altId: string) => {
                        const altMat = materialsData?.data?.find(
                          (m: any) => m._id === altId
                        );
                        if (altMat) {
                          matOptions.push({
                            value: altId,
                            label: altMat.brand
                              ? `${altMat.name} [Merek: ${altMat.brand}] (Stok: ${round(altMat.currentStock || 0, 2)} ${altMat.unit}) (Alternatif)`
                              : `${altMat.name} (Stok: ${round(altMat.currentStock || 0, 2)} ${altMat.unit}) (Alternatif)`
                          });
                        }
                      });
                    }

                    return (
                      <div
                        key={ing._id}
                        className={cn(
                          'flex flex-col sm:flex-row sm:items-center justify-between p-2.5 border rounded-sm shadow-2xs gap-2 transition-colors',
                          isStockInsufficient
                            ? 'bg-red-50/40 border-red-200'
                            : 'bg-white border-orange-200/80'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-1.5 h-1.5 rounded-sm shrink-0',
                              isStockInsufficient
                                ? 'bg-red-500'
                                : 'bg-orange-500'
                            )}
                          />
                          <div>
                            <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5 flex-wrap">
                              <span>
                                {selectedMat?.name ||
                                  primaryMat?.name ||
                                  'Bahan Baku'}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200">
                                Kebutuhan: {calculatedQty} {ing.unit}
                              </span>
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-bold border',
                                  isStockInsufficient
                                    ? 'bg-red-100 text-red-800 border-red-300'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                )}
                              >
                                Stok Tersedia: {currentStock}{' '}
                                {selectedMat?.unit || ing.unit}
                                {isStockInsufficient && ' (Kurang)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {matOptions.length > 1 ? (
                          <div className="w-full sm:w-[260px] shrink-0">
                            <ReusableSelect
                              options={matOptions}
                              value={selectedMatId}
                              onChange={(val) =>
                                handleMaterialUsageChange(
                                  ing._id,
                                  val as string
                                )
                              }
                              placeholder="Pilih Bahan..."
                              searchable={true}
                              className="h-8 text-xs font-normal"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500 font-medium bg-gray-50 px-2 py-1 border border-gray-200 rounded-sm self-start sm:self-auto">
                            Default
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 px-1 border-t">
            <Button
              type="button"
              variant="ghost"
              className="font-bold rounded-sm h-11"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedProduct?.recipe}
              className="font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-sm h-11 flex-1 shadow-lg shadow-orange-100"
              isLoading={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
