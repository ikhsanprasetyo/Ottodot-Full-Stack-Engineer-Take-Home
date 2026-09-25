'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  ArrowLeft,
  CheckCircle2,
  Lock,
  ChevronRight,
  BookMarked,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { setDateStr } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import api from '@/lib/api/api';

import { useGetRTUProduct } from '@/lib/hooks/queries/rtu-product';
import { useGetRTURecipeByProduct } from '@/lib/hooks/queries/rtu-recipe';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { MultiSelect } from '@/components/ui/multi-select';

const ingredientSchema = z.object({
  materialId: z.string().min(1, 'Pilih material'),
  alternativeMaterialIds: z.array(z.string()).optional(),
  qty: z.coerce.number().min(0.0001, 'Qty minimal 0.0001'),
  unit: z.string().min(1, 'Satuan wajib diisi')
});

const formSchema = z.object({
  versionNumber: z.string().min(1, 'Versi wajib diisi (misal: 1.0)'),
  expectedOutput: z.coerce.number().min(0.1, 'Output minimal 0.1'),
  notes: z.string().optional(),
  ingredients: z.array(ingredientSchema).min(1, 'Minimal satu bahan baku')
});

export default function RecipeBuilderClient() {
  const params = useParams();
  const router = useRouter();
  const rawProductId = Array.isArray(params?.productId)
    ? params.productId[0]
    : params?.productId;
  const productId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== 'recipe') {
        return lastPart;
      }
    }
    return (rawProductId as string) || '';
  }, [rawProductId]);

  const [isLoading, setIsLoading] = useState(false);
  const [activatingVersion, setActivatingVersion] = useState<string | null>(
    null
  );
  const queryClient = useQueryClient();

  const { data: productData, isFetching: productLoading } =
    useGetRTUProduct(productId);
  const { data: recipeData, isFetching: recipeLoading } =
    useGetRTURecipeByProduct(productId);
  const { data: materialsData } = useGetRTUMaterials('', true); // get all active materials

  const product = productData?.data;
  const recipe = recipeData?.data;
  const versions = recipe?.versions || [];
  const materials = useMemo(() => materialsData?.data || [], [materialsData]);

  const materialOptions = useMemo(() => {
    return materials.map((m) => {
      const brandStr = m.brand ? ` - ${m.brand}` : '';
      return {
        label: `${m.name}${brandStr} (${m.code})`,
        value: m._id,
        unit: m.unit,
        code: m.code
      };
    });
  }, [materials]);

  const activeVersion = versions.find((v: any) => v.status === 'active');
  const draftVersion = versions.find((v: any) => v.status === 'draft');
  const archivedVersions = versions.filter((v: any) => v.status === 'archived');

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      versionNumber: '',
      expectedOutput: 1,
      notes: '',
      ingredients: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ingredients'
  });

  // Sync form with draft if exists, else guess next version
  useEffect(() => {
    if (draftVersion) {
      form.reset({
        versionNumber: draftVersion.versionNumber,
        expectedOutput: draftVersion.expectedOutput,
        notes: draftVersion.notes || '',
        ingredients:
          draftVersion.ingredients?.map((ing: any) => ({
            materialId: ing.materialId,
            alternativeMaterialIds: ing.alternativeMaterialIds || [],
            qty: ing.qty,
            unit: ing.unit
          })) || []
      });
    } else {
      // Suggest a new version
      let nextVer = '1.0';
      if (activeVersion) {
        const parts = activeVersion.versionNumber.split('.');
        if (parts.length === 2 && !isNaN(Number(parts[1]))) {
          nextVer = `${parts[0]}.${Number(parts[1]) + 1}`;
        } else {
          nextVer = activeVersion.versionNumber + '.1';
        }
      }
      form.reset({
        versionNumber: nextVer,
        expectedOutput: 1,
        notes: '',
        ingredients: []
      });
    }
  }, [draftVersion, activeVersion, product, form]);

  const onSaveDraft = async (values: any) => {
    try {
      setIsLoading(true);
      if (draftVersion) {
        await api.delete(`/rtu/recipe/version/${draftVersion._id}`);
      }

      await api.post(`/rtu/recipe/${productId}/draft`, values);
      queryClient.invalidateQueries({ queryKey: ['rtu-recipe', productId] });
      toast.success('Draft resep berhasil disimpan');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan draft');
    } finally {
      setIsLoading(false);
    }
  };

  const onActivate = async (versionId: string) => {
    try {
      if (!recipe?._id) return;
      setActivatingVersion(versionId);
      await api.post(`/rtu/recipe/${recipe._id}/activate/${versionId}`);
      queryClient.invalidateQueries({ queryKey: ['rtu-recipe', productId] });
      toast.success(
        'Versi resep berhasil diaktifkan. Berlaku untuk produksi selanjutnya.'
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal aktivasi resep');
    } finally {
      setActivatingVersion(null);
    }
  };

  const onDeleteDraft = async (versionId: string) => {
    try {
      setIsLoading(true);
      await api.delete(`/rtu/recipe/version/${versionId}`);
      queryClient.invalidateQueries({ queryKey: ['rtu-recipe', productId] });
      toast.success('Draft resep dihapus');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal hapus draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = (version: any) => {
    if (!version) return;

    let nextVer = '1.0';
    if (activeVersion) {
      const parts = activeVersion.versionNumber.split('.');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        nextVer = `${parts[0]}.${Number(parts[1]) + 1}`;
      } else {
        nextVer = activeVersion.versionNumber + '.1';
      }
    }

    form.reset({
      versionNumber: nextVer,
      expectedOutput: version.expectedOutput,
      notes:
        `Salinan dari v${version.versionNumber}` +
        (version.notes ? `: ${version.notes}` : ''),
      ingredients:
        version.ingredients?.map((ing: any) => ({
          materialId: ing.materialId,
          alternativeMaterialIds: ing.alternativeMaterialIds || [],
          qty: ing.qty,
          unit: ing.unit
        })) || []
    });

    toast.success(
      `Berhasil menyalin formulasi dari Versi ${version.versionNumber} ke Form Draf`
    );
  };

  const handleMaterialChange = (materialId: string, index: number) => {
    const selectedMat = materials.find((m) => m._id === materialId);
    if (selectedMat) {
      form.setValue(`ingredients.${index}.materialId`, materialId);
      form.setValue(`ingredients.${index}.unit`, selectedMat.unit);
      form.trigger(`ingredients.${index}.materialId`);
    }
  };

  const getMaterialCode = (id: string) => {
    const mat = materials.find((m) => m._id === id);
    return mat ? mat.code : '';
  };

  if (productLoading || recipeLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64 text-gray-500">
          Memuat Formulasi Resep...
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-red-500 p-6 flex flex-col items-center">
          <h3>Produk tidak ditemukan</h3>
          <Button onClick={() => router.push('/rtu/product')} className="mt-4">
            Kembali
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 pb-20">
        {/* Header Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <button
            onClick={() => router.push('/rtu/product')}
            className="hover:text-brand-500 flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Produk Master
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="font-semibold text-gray-800">Recipe Builder</span>
        </div>

        {/* Product Info Card */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h1 className="text-2xl font-black text-blue-900 tracking-tight">
              {product.name}
            </h1>
            <p className="text-blue-700 mt-1 flex items-center gap-2">
              <span className="font-mono text-sm bg-blue-100 px-2 py-0.5 rounded-sm">
                {product.code}
              </span>
              <span>
                Satuan Output: <b>{product.outputUnit}</b>
              </span>
            </p>
          </div>
          <div className="text-right">
            {activeVersion ? (
              <div className="flex flex-col items-end">
                <Badge className="bg-emerald-500 text-white border-none py-1">
                  Versi Aktif: v{activeVersion.versionNumber}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  Digunakan untuk Job Costing
                </p>
              </div>
            ) : (
              <Badge
                variant="outline"
                className="text-gray-400 border-gray-300"
              >
                Belum Ada Resep Aktif
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT PANE: Builder Form */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            <div className="bg-white rounded-sm shadow-sm border border-brand-200 overflow-hidden">
              <div className="bg-brand-50 border-b border-brand-100 px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-bold text-brand-900 flex items-center">
                  <BookMarked className="w-5 h-5 mr-2 text-blue-500" />
                  {draftVersion
                    ? 'Melanjutkan Draft Resep'
                    : 'Buat Draft Resep Baru'}
                </h2>
                {draftVersion && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 border-amber-200"
                  >
                    Draft Tersimpan
                  </Badge>
                )}
              </div>

              <div className="p-6">
                <form
                  onSubmit={form.handleSubmit(onSaveDraft)}
                  className="space-y-6"
                >
                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-6 p-5 bg-gray-50 rounded-sm border border-gray-100">
                    <FormInput
                      form={form}
                      name="versionNumber"
                      label="Label Versi Baru *"
                      placeholder="Contoh: 1.0"
                    />
                    <div>
                      <FormInput
                        form={form}
                        name="expectedOutput"
                        label={`Target Output (${product.outputUnit}) *`}
                        type="number"
                        containerClassName="mb-1"
                      />
                      <p className="text-[11px] text-gray-500 leading-normal">
                        Target jumlah hasil jadi (yield) dari takaran bahan baku
                        di bawah.
                        <br />
                        <span className="text-gray-400">
                          Contoh: Jika resep di bawah dirancang untuk
                          menghasilkan 10 {product.outputUnit}, maka isi{' '}
                          <b>10</b>. Saat produksi, kebutuhan bahan akan
                          dikalkulasi otomatis secara proporsional.
                        </span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <FormInput
                        form={form}
                        name="notes"
                        label="Catatan Formulasi"
                        placeholder="Alasan perubahan/pembuatan versi ini..."
                      />
                    </div>
                  </div>

                  {/* Ingredients Array as Table */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-semibold text-gray-800">
                        Komposisi Bahan Baku
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          append({ materialId: '', qty: 1, unit: '' })
                        }
                        icon={Plus}
                      >
                        Add Material
                      </Button>
                    </div>

                    <div className="rounded-sm border border-gray-200 overflow-hidden shadow-sm">
                      <Table className="w-full">
                        <TableHeader className="bg-slate-900">
                          <TableRow className="h-10 border-none">
                            <TableHead className="w-[50px] text-center text-white text-[11px] uppercase tracking-wider font-bold">
                              #
                            </TableHead>
                            <TableHead className="w-[120px] text-white text-[11px] uppercase tracking-wider font-bold">
                              Code
                            </TableHead>
                            <TableHead className="min-w-[200px] text-white text-[11px] uppercase tracking-wider font-bold">
                              Material Name
                            </TableHead>
                            <TableHead className="min-w-[200px] text-white text-[11px] uppercase tracking-wider font-bold">
                              Material Alternatif
                            </TableHead>
                            <TableHead className="w-[120px] text-white text-[11px] uppercase tracking-wider font-bold">
                              Qty
                            </TableHead>
                            <TableHead className="w-[100px] text-white text-[11px] uppercase tracking-wider font-bold">
                              Unit
                            </TableHead>
                            <TableHead className="w-[100px] text-right text-white text-[11px] uppercase tracking-wider font-bold pr-4">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="h-32 text-center text-gray-500 italic bg-gray-50/30"
                              >
                                Belum ada bahan terpilih. Klik &quot;Add
                                Material&quot; untuk memulai.
                              </TableCell>
                            </TableRow>
                          ) : (
                            fields.map((field, index) => (
                              <TableRow
                                key={field.id}
                                className="group hover:bg-slate-50/50 transition-colors"
                              >
                                <TableCell className="text-center font-mono text-xs text-gray-400">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  <div className="bg-gray-100/80 border border-gray-200 rounded-sm h-9 flex items-center px-3 font-mono text-xs text-gray-500">
                                    {getMaterialCode(
                                      form.watch(
                                        `ingredients.${index}.materialId`
                                      )
                                    ) || '---'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <ReusableSelect
                                    options={materialOptions}
                                    value={form.watch(
                                      `ingredients.${index}.materialId`
                                    )}
                                    onChange={(val) =>
                                      handleMaterialChange(val as string, index)
                                    }
                                    searchable={true}
                                    showDefaultSelect={true}
                                    placeholder="-- Select --"
                                    className="border-none p-0"
                                  />
                                  {form.formState.errors?.ingredients?.[index]
                                    ?.materialId && (
                                    <p className="text-[10px] text-red-500 font-medium mt-1">
                                      {
                                        form.formState.errors.ingredients[index]
                                          ?.materialId?.message
                                      }
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <MultiSelect
                                    options={materialOptions.filter(
                                      (m) =>
                                        m.value !==
                                        form.watch(
                                          `ingredients.${index}.materialId`
                                        )
                                    )}
                                    selected={
                                      form.watch(
                                        `ingredients.${index}.alternativeMaterialIds`
                                      ) || []
                                    }
                                    onChange={(val) =>
                                      form.setValue(
                                        `ingredients.${index}.alternativeMaterialIds`,
                                        val
                                      )
                                    }
                                    placeholder="Select Alternatives"
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormInput
                                    form={form}
                                    name={`ingredients.${index}.qty`}
                                    type="number"
                                    className="h-9 text-sm text-center"
                                    containerClassName="mb-0"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="bg-gray-100/80 border border-gray-200 rounded-sm h-9 flex items-center justify-center px-2 font-medium text-xs text-gray-600">
                                    {form.watch(`ingredients.${index}.unit`) ||
                                      '-'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right pr-4">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => remove(index)}
                                    size="sm"
                                    className="h-8 px-3 rounded-sm text-[11px] font-bold uppercase tracking-tighter"
                                  >
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                    <div>
                      {draftVersion && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => onDeleteDraft(draftVersion._id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          Hapus Draft Ini
                        </Button>
                      )}
                    </div>
                    <div className="space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className="border-gray-200 hover:bg-gray-50 text-gray-600 h-10 px-6 font-bold"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Saving...' : 'Save Draft'}
                      </Button>

                      {draftVersion && (
                        <Button
                          type="button"
                          onClick={() => onActivate(draftVersion._id)}
                          disabled={activatingVersion === draftVersion._id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6 shadow-lg shadow-emerald-200 font-bold rounded-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {activatingVersion === draftVersion._id
                            ? 'Mengaktifkan...'
                            : 'Activate Recipe'}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* RIGHT PANE: Version History Panel */}
          <div className="col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 flex items-center mb-4">
                <BookMarked className="w-5 h-5 mr-2 text-blue-500" /> Profil
                Resep Aktif
              </h3>

              <div className="space-y-4">
                {activeVersion ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-sm">
                      Active
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-emerald-900">
                        Versi {activeVersion.versionNumber}
                      </p>
                      <span className="text-[10px] bg-emerald-200/60 text-emerald-900 font-bold px-1.5 py-0.5 rounded-sm">
                        Target: {activeVersion.expectedOutput}{' '}
                        {product.outputUnit}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-0.5 mb-2">
                      {activeVersion.notes
                        ? activeVersion.notes.split(':')[0].trim()
                        : 'Tidak ada catatan'}
                    </p>

                    <div className="space-y-1 border-t border-emerald-200/50 pt-2">
                      <p className="text-[10px] uppercase font-bold text-emerald-800/70 mb-1">
                        Formulasi Aktif:
                      </p>
                      {activeVersion.ingredients?.map((ing: any) => {
                        const altMaterials: { name: string; brand?: string }[] =
                          (
                            ing.alternatives?.map((a: any) => ({
                              name: a.name,
                              brand: a.brand
                            })) ||
                            (ing.alternativeMaterialIds || []).map(
                              (id: string) => {
                                const m = materials.find((m) => m._id === id);
                                return m
                                  ? { name: m.name, brand: m.brand }
                                  : { name: id };
                              }
                            )
                          ).filter((a: any) => Boolean(a.name));
                        return (
                          <div key={ing._id} className="space-y-0.5">
                            <div className="flex justify-between items-center text-[11px] text-emerald-900">
                              <span className="font-medium">
                                {ing.material?.name || 'Unknown Material'}
                                {ing.material?.brand && (
                                  <span className="text-[10px] text-emerald-600/60 font-normal">
                                    {' '}
                                    ({ing.material.brand})
                                  </span>
                                )}
                              </span>
                              <span className="font-bold ml-2 shrink-0">
                                {ing.qty} {ing.unit}
                              </span>
                            </div>
                            {altMaterials.length > 0 && (
                              <div className="flex flex-wrap gap-1 pl-2">
                                {altMaterials.map((alt, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center text-[9px] bg-emerald-100/70 text-emerald-700 border border-emerald-200/60 px-1.5 py-0 rounded-sm"
                                  >
                                    <span className="font-semibold">
                                      alt: {alt.name}
                                    </span>
                                    {alt.brand && (
                                      <span className="font-normal opacity-70 ml-0.5">{`(${alt.brand})`}</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="pt-2 border-t border-emerald-200/50 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDuplicate(activeVersion)}
                          className="w-full text-xs font-bold text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-100 hover:text-emerald-800 h-8 rounded-sm uppercase tracking-wider flex items-center justify-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy Resep Aktif
                        </Button>
                      </div>
                      <div className="mt-2 text-[10px] text-emerald-600/80 text-right">
                        Dibuat:{' '}
                        {setDateStr(
                          activeVersion.createdAt,
                          'ddd, DD MMM YYYY HH:mm:ss'
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-sm text-center border border-dashed border-gray-200">
                    Belum ada versi yang aktif.
                  </div>
                )}

                {archivedVersions.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-3">
                      Versi Terdahulu (Locked)
                    </p>
                    <div className="space-y-3">
                      {archivedVersions.map((v: any) => (
                        <div
                          key={v._id}
                          className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-700 flex items-center">
                                v{v.versionNumber}
                                <Lock className="w-3 h-3 ml-2 text-gray-400" />
                              </p>
                              <span className="text-[10px] bg-gray-200 text-gray-700 font-bold px-1.5 py-0.5 rounded-sm">
                                Target: {v.expectedOutput} {product.outputUnit}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(v)}
                              className="text-xs text-blue-500 hover:underline font-semibold flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 mb-1.5 truncate">
                            {v.notes || 'Tidak ada catatan'}
                          </p>
                          <div className="space-y-1 border-t border-gray-200/50 pt-1.5 mt-1.5">
                            {v.ingredients?.map((ing: any) => {
                              const altMaterials: {
                                name: string;
                                brand?: string;
                              }[] = (
                                ing.alternatives?.map((a: any) => ({
                                  name: a.name,
                                  brand: a.brand
                                })) ||
                                (ing.alternativeMaterialIds || []).map(
                                  (id: string) => {
                                    const m = materials.find(
                                      (m) => m._id === id
                                    );
                                    return m
                                      ? { name: m.name, brand: m.brand }
                                      : { name: id };
                                  }
                                )
                              ).filter((a: any) => Boolean(a.name));
                              return (
                                <div key={ing._id} className="space-y-0.5">
                                  <div className="flex justify-between items-center text-[11px] text-gray-600">
                                    <span className="font-medium">
                                      {ing.material?.name || 'Unknown Material'}
                                      {ing.material?.brand && (
                                        <span className="text-[10px] text-gray-400/80 font-normal">
                                          {' '}
                                          ({ing.material.brand})
                                        </span>
                                      )}
                                    </span>
                                    <span className="font-semibold text-gray-700 ml-2 shrink-0">
                                      {ing.qty} {ing.unit}
                                    </span>
                                  </div>
                                  {altMaterials.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pl-2">
                                      {altMaterials.map((alt, i) => (
                                        <span
                                          key={i}
                                          className="inline-flex items-center text-[9px] bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0 rounded-sm"
                                        >
                                          <span className="font-semibold">
                                            alt: {alt.name}
                                          </span>
                                          {alt.brand && (
                                            <span className="font-normal opacity-70 ml-0.5">{`(${alt.brand})`}</span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-2 text-[10px] text-gray-400 text-right">
                            Dibuat:{' '}
                            {setDateStr(
                              v.createdAt,
                              'ddd, DD MMM YYYY HH:mm:ss'
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
