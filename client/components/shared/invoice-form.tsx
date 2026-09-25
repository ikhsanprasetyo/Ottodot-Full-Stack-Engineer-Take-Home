'use client';

import { useMemo } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import {
  CheckCircle2,
  Plus,
  Trash2,
  ShoppingCart,
  Calendar,
  Percent,
  Truck,
  ArrowUpFromLine,
  ArrowDownFromLine,
  StickyNote
} from 'lucide-react';
import dayjs from 'dayjs';

import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { DialogFooterSummary } from '@/components/ui/dialog-footer-summary';
import { toIDR } from '@/lib/utils';

interface InvoiceFormContentProps {
  form: any;
  onSubmit: (e: any) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  mode: 'invoice' | 'grn';

  // Invoice mode props
  purchaseOptions?: { value: string; label: string }[];
  linkedGrns?: any[];
  materialNameMap?: Map<string, string>;
  materialsMap?: Map<string, any>;

  // GRN mode props
  outletName?: string;
  vendorName?: string;
  selectedPo?: any;
  grnsResponse?: any;
  grnId?: string;
  purchaseId?: string;
  grnItemsOriginal?: any[];
  canUpdate?: boolean;
}

export function InvoiceFormContent({
  form,
  onSubmit,
  isSubmitting,
  onCancel,
  mode,
  purchaseOptions = [],
  linkedGrns = [],
  materialNameMap = new Map(),
  materialsMap = new Map(),
  outletName = '',
  vendorName = '',
  selectedPo,
  grnsResponse,
  grnId = '',
  purchaseId = '',
  grnItemsOriginal = [],
  canUpdate = true
}: InvoiceFormContentProps) {
  const { fields } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const {
    fields: additionalCostsFields,
    append,
    remove
  } = useFieldArray({
    control: form.control,
    name: 'additionalCosts'
  });

  const watchItems = useWatch({
    control: form.control,
    name: 'items'
  });

  const watchAdditionalCosts = useWatch({
    control: form.control,
    name: 'additionalCosts'
  });

  const watchTaxPercent = form.watch('taxPercent') || 0;

  // Calculate financials dynamically
  const subtotal = useMemo(() => {
    const items = watchItems || [];
    return items.reduce((acc: number, item: any) => {
      const qty = Number(
        item?.[mode === 'invoice' ? 'qtyInvoiced' : 'qtyReceived'] || 0
      );
      const price = Number(item?.unitPrice || 0);
      const disc = Number(item?.discount || 0);
      return acc + qty * price * (1 - disc / 100);
    }, 0);
  }, [watchItems, mode]);

  const taxAmount = (subtotal * watchTaxPercent) / 100;

  const watchShippingFee = form.watch('shippingFee') || 0;
  const watchLoadingFee = form.watch('loadingFee') || 0;
  const watchUnloadingFee = form.watch('unloadingFee') || 0;

  const customAdditionalCostsTotal = useMemo(() => {
    const costs = watchAdditionalCosts || [];
    return costs.reduce(
      (acc: number, c: any) => acc + Number(c?.amount || 0),
      0
    );
  }, [watchAdditionalCosts]);

  const grandTotal =
    subtotal +
    taxAmount +
    watchShippingFee +
    watchLoadingFee +
    watchUnloadingFee +
    customAdditionalCostsTotal;

  const summaryItems = useMemo(() => {
    return [
      {
        label: 'Subtotal',
        value: subtotal
      },
      watchTaxPercent > 0 && {
        label: `PPN (${watchTaxPercent}%)`,
        value: taxAmount
      },
      watchShippingFee > 0 && {
        label: 'Ongkos Kirim',
        value: watchShippingFee
      },
      watchLoadingFee > 0 && {
        label: 'Biaya Muat',
        value: watchLoadingFee
      },
      watchUnloadingFee > 0 && {
        label: 'Biaya Bongkar',
        value: watchUnloadingFee
      },
      ...(watchAdditionalCosts || []).map((c: any) => ({
        label: c.name || 'Biaya Lain',
        value: Number(c.amount || 0)
      })),
      {
        label: mode === 'invoice' ? 'Total Invoice' : 'Total Estimasi',
        value: grandTotal,
        isHighlight: true
      }
    ].filter(Boolean) as any[];
  }, [
    subtotal,
    watchTaxPercent,
    taxAmount,
    watchShippingFee,
    watchLoadingFee,
    watchUnloadingFee,
    watchAdditionalCosts,
    grandTotal,
    mode
  ]);

  return (
    <form
      onSubmit={onSubmit}
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top metadata fields grid */}
        {mode === 'invoice' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <ReusableSelect
                label="Pilih PO (opsional)"
                icon={ShoppingCart}
                value={form.watch('purchaseId') || ''}
                onChange={(v) => form.setValue('purchaseId', String(v || ''))}
                options={purchaseOptions}
                placeholder="Pilih Purchase Order..."
                searchable
                triggerClassName="h-10 border-gray-200 text-sm"
              />
            </div>
            <div className="md:col-span-4">
              <FormInput
                label="Tanggal Invoice"
                icon={Calendar}
                name="invoiceDate"
                type="datetime-local"
                value={form.watch('invoiceDate')}
                onChange={(e: any) =>
                  form.setValue('invoiceDate', e.target.value)
                }
                containerClassName="mb-0"
              />
            </div>
            <div className="md:col-span-2">
              <FormInput
                label="PPN (%)"
                icon={Percent}
                name="taxPercent"
                type="number"
                step="any"
                value={
                  form.watch('taxPercent') === 0 ? '' : form.watch('taxPercent')
                }
                onChange={(e: any) =>
                  form.setValue(
                    'taxPercent',
                    e.target.value === '' ? 0 : Number(e.target.value)
                  )
                }
                containerClassName="mb-0 w-[90px]"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50/30 rounded-sm border border-blue-100">
            <div>
              <Label className="text-xs font-bold text-gray-500">
                Cabang Penerima
              </Label>
              <p className="font-bold text-gray-800 text-sm mt-1">
                {outletName || '-'}
              </p>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500">Vendor</Label>
              <p className="font-bold text-gray-800 text-sm mt-1">
                {vendorName || '-'}
              </p>
            </div>
            <div>
              <FormInput
                label="Tanggal Penerimaan"
                icon={Calendar}
                type="datetime-local"
                name="receiptDate"
                value={form.watch('receiptDate')}
                onChange={(e: any) =>
                  form.setValue('receiptDate', e.target.value)
                }
                className="h-9 mt-1"
                containerClassName="mb-0"
              />
            </div>
          </div>
        )}

        {/* Linked GRNs info section (Invoice Mode Only) */}
        {mode === 'invoice' && linkedGrns.length > 0 && (
          <div className="space-y-3 p-4 bg-emerald-50/50 rounded-sm border border-emerald-100/80">
            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] font-bold text-emerald-700 mr-1 self-center">
                GRN Terkait ({linkedGrns.length}):
              </span>
              {linkedGrns.map((g: any) => (
                <span
                  key={g._id}
                  className="text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200 rounded-sm px-2 py-0.5 shadow-sm"
                >
                  {g.grnNumber}
                  <span className="text-gray-400 ml-1">
                    {dayjs(g.receiptDate).format('DD/MM')}
                  </span>
                </span>
              ))}
            </div>

            {/* Detailed GRN Items Breakdown */}
            <div className="bg-white border border-emerald-100/50 rounded-sm p-3 space-y-2.5 shadow-sm">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Rincian Item dari GRN Terkait
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {linkedGrns.map((g: any) => (
                  <div
                    key={g._id}
                    className="border border-gray-100 rounded-sm p-2.5 bg-gray-50/30"
                  >
                    <div className="flex justify-between items-center border-b pb-1.5 mb-2">
                      <span className="text-xs font-mono font-bold text-gray-700">
                        {g.grnNumber}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {dayjs(g.receiptDate).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {g.items?.map((item: any) => {
                        const matName =
                          materialNameMap.get(item.materialId) ||
                          item.material?.name ||
                          'Unknown Material';
                        const matBrand =
                          materialNameMap.get(`${item.materialId}_brand`) ||
                          item.material?.brand ||
                          '';
                        return (
                          <li
                            key={item._id}
                            className="text-xs flex justify-between items-start text-gray-600"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800">
                                {matName}
                              </span>
                              {matBrand && (
                                <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 rounded-sm px-1 w-fit mt-0.5">
                                  {matBrand}
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-gray-700 bg-gray-100/50 rounded-sm px-1.5 py-0.5 self-center">
                              {item.qtyReceived} {item.unit}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div>
          <h3 className="font-bold text-gray-700 text-xs tracking-wider uppercase border-b pb-2 mb-3">
            Items & Pricing
          </h3>
          {fields.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8 border border-dashed rounded-sm">
              Pilih PO untuk auto-fill items, atau tambah manual.
            </div>
          ) : (
            <div className="border border-gray-100 rounded-sm overflow-hidden shadow-sm">
              <Table className="w-full" containerClassName="h-auto w-full">
                <TableHeader className="bg-gray-50">
                  <TableRow className="hover:bg-transparent border-gray-100 h-8">
                    <TableHead className="font-bold text-gray-600 text-xs py-1 px-2.5 min-w-[180px]">
                      Material
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-right text-xs py-1 px-2.5 w-[110px]">
                      {mode === 'invoice' ? 'Qty Invoiced' : 'Qty'}
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-center text-xs py-1 px-2.5 w-[60px]">
                      Unit
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-right text-xs py-1 px-2.5 w-[130px]">
                      Harga Master
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-right text-xs py-1 px-2.5 w-[150px]">
                      Harga Satuan
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-center text-xs py-1 px-2.5 w-[70px]">
                      Diskon %
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-right text-xs py-1 px-2.5 w-[130px]">
                      Subtotal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field: any, idx: number) => {
                    const materialId = field.materialId;
                    const matName =
                      mode === 'invoice'
                        ? materialNameMap.get(materialId) || 'Material'
                        : grnItemsOriginal?.[idx]?.material?.name || 'Material';
                    const matCode =
                      mode === 'invoice'
                        ? materialNameMap.get(`${materialId}_code`) || ''
                        : grnItemsOriginal?.[idx]?.material?.code || '';
                    const matBrand =
                      mode === 'invoice'
                        ? materialNameMap.get(`${materialId}_brand`) || ''
                        : grnItemsOriginal?.[idx]?.material?.brand || '';

                    const lineQty = Number(
                      watchItems[idx]?.[
                        mode === 'invoice' ? 'qtyInvoiced' : 'qtyReceived'
                      ] || 0
                    );
                    const linePrice = Number(watchItems[idx]?.unitPrice || 0);
                    const lineDiscount = Number(watchItems[idx]?.discount || 0);
                    const lineTotal =
                      lineQty * linePrice * (1 - lineDiscount / 100);

                    // Compute registered Master Material price (taking unit conversion into account)
                    const matObj =
                      materialsMap?.get(materialId) ||
                      (grnItemsOriginal?.[idx]?.material
                        ? grnItemsOriginal[idx].material
                        : null);

                    let masterUnitPrice = 0;
                    if (matObj) {
                      let conversionFactor = 1;
                      const currentUnit = field.unit || watchItems[idx]?.unit;
                      if (currentUnit && currentUnit !== matObj.unit) {
                        const matchUnit = matObj.units?.find(
                          (u: any) => u.unitName === currentUnit
                        );
                        if (matchUnit) {
                          conversionFactor = matchUnit.conversion || 1;
                        }
                      }
                      masterUnitPrice =
                        (matObj.currentPrice || 0) * conversionFactor;
                    } else if (
                      mode === 'invoice' &&
                      materialNameMap.has(`${materialId}_price`)
                    ) {
                      masterUnitPrice = Number(
                        materialNameMap.get(`${materialId}_price`) || 0
                      );
                    }

                    // PO/Received info for GRN mode
                    const poItem = selectedPo?.items?.find(
                      (i: any) => i.materialId === materialId
                    );
                    const qtyPo = poItem ? poItem.qty : 0;

                    let previouslyReceived = 0;
                    if (
                      mode === 'grn' &&
                      purchaseId &&
                      grnsResponse?.data &&
                      grnId
                    ) {
                      const poConfirmedGrns = grnsResponse.data.filter(
                        (g: any) =>
                          g.purchaseId === purchaseId &&
                          g.status !== 'CANCELLED'
                      );
                      poConfirmedGrns.forEach((g: any) => {
                        if (g._id === grnId) return;
                        g.items?.forEach((i: any) => {
                          if (i.materialId === materialId) {
                            previouslyReceived += i.qtyReceived || 0;
                          }
                        });
                      });
                    }

                    if (mode === 'grn' && !canUpdate) return null;

                    return (
                      <TableRow
                        key={field.id}
                        className="border-gray-100 hover:bg-slate-50/50 transition-colors h-9"
                      >
                        <TableCell className="py-1 px-2.5">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-bold text-gray-800 text-xs">
                              {matName}
                            </span>
                            {matCode && (
                              <span className="text-[10px] font-mono text-gray-400">
                                ({matCode})
                              </span>
                            )}
                            {matBrand && (
                              <span className="text-indigo-600 font-semibold bg-indigo-50 rounded-sm px-1 text-[9px]">
                                {matBrand}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2.5 text-right">
                          <FormInput
                            type="number"
                            step="any"
                            name={
                              mode === 'invoice'
                                ? `items.${idx}.qtyInvoiced`
                                : `items.${idx}.qtyReceived`
                            }
                            value={form.watch(
                              mode === 'invoice'
                                ? `items.${idx}.qtyInvoiced`
                                : `items.${idx}.qtyReceived`
                            )}
                            onChange={(e: any) =>
                              form.setValue(
                                mode === 'invoice'
                                  ? `items.${idx}.qtyInvoiced`
                                  : `items.${idx}.qtyReceived`,
                                Number(e.target.value)
                              )
                            }
                            className="h-7 py-0 px-2 text-xs text-right font-normal border border-gray-200"
                            containerClassName="mb-0"
                          />
                          {mode === 'grn' && purchaseId && qtyPo > 0 && (
                            <div className="text-[9px] text-gray-500 font-medium space-x-1 whitespace-nowrap text-right pr-1">
                              <span>
                                PO:{' '}
                                <strong className="font-bold text-gray-700">
                                  {qtyPo} {field.unit}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Diterima:{' '}
                                <strong className="font-bold text-gray-700">
                                  {previouslyReceived} {field.unit}
                                </strong>
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-1 px-2.5 text-center font-medium text-gray-500 text-xs">
                          {field.unit}
                        </TableCell>
                        <TableCell className="py-1 px-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end">
                            <span className="font-mono text-xs font-bold text-gray-700 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-sm inline-flex items-center gap-1">
                              {masterUnitPrice > 0 ? (
                                <>
                                  <span>{toIDR(masterUnitPrice)}</span>
                                  <span className="text-[10px] text-gray-400 font-normal">
                                    / {field.unit || 'unit'}
                                  </span>
                                </>
                              ) : (
                                '-'
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2.5 text-right">
                          <FormInput
                            name={`items.${idx}.unitPrice`}
                            type="currency"
                            value={form.watch(`items.${idx}.unitPrice`)}
                            onChange={(e: any) =>
                              form.setValue(
                                `items.${idx}.unitPrice`,
                                typeof e.target.value === 'string'
                                  ? Number(
                                      e.target.value.replace(/[^0-9]/g, '')
                                    )
                                  : Number(e.target.value)
                              )
                            }
                            className="h-7 py-0 px-2 text-xs text-right font-normal border-gray-200"
                            containerClassName="mb-0"
                          />
                        </TableCell>
                        <TableCell className="py-1 px-2.5 text-center">
                          <FormInput
                            name={`items.${idx}.discount`}
                            type="number"
                            step="any"
                            value={
                              form.watch(`items.${idx}.discount`) === 0
                                ? ''
                                : form.watch(`items.${idx}.discount`)
                            }
                            onChange={(e: any) =>
                              form.setValue(
                                `items.${idx}.discount`,
                                e.target.value === ''
                                  ? 0
                                  : Number(e.target.value)
                              )
                            }
                            className="h-7 py-0 px-2 text-xs text-center font-normal border-gray-200"
                            containerClassName="mb-0"
                          />
                        </TableCell>
                        <TableCell className="py-1 px-2.5 text-right font-bold text-xs font-mono text-gray-900">
                          {toIDR(lineTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Service Fees, Custom Fees & Notes Section */}
        <div className="space-y-4">
          <div className="bg-slate-50 border border-gray-200 rounded-sm p-4 space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Biaya Jasa & Pengiriman (Opsional)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FormInput
                  label="Ongkos Kirim/Shipping"
                  icon={Truck}
                  name="shippingFee"
                  type="currency"
                  value={form.watch('shippingFee')}
                  onChange={(e: any) =>
                    form.setValue(
                      'shippingFee',
                      typeof e.target.value === 'string'
                        ? Number(e.target.value.replace(/[^0-9]/g, ''))
                        : Number(e.target.value)
                    )
                  }
                  placeholder="Rp 0"
                  containerClassName="mb-0"
                />
              </div>
              <div>
                <FormInput
                  label="Ongkos Angkat/Loading"
                  icon={ArrowUpFromLine}
                  name="loadingFee"
                  type="currency"
                  value={form.watch('loadingFee')}
                  onChange={(e: any) =>
                    form.setValue(
                      'loadingFee',
                      typeof e.target.value === 'string'
                        ? Number(e.target.value.replace(/[^0-9]/g, ''))
                        : Number(e.target.value)
                    )
                  }
                  placeholder="Rp 0"
                  containerClassName="mb-0"
                />
              </div>
              <div>
                <FormInput
                  label="Ongkos Bongkar/Unloading"
                  icon={ArrowDownFromLine}
                  name="unloadingFee"
                  type="currency"
                  value={form.watch('unloadingFee')}
                  onChange={(e: any) =>
                    form.setValue(
                      'unloadingFee',
                      typeof e.target.value === 'string'
                        ? Number(e.target.value.replace(/[^0-9]/g, ''))
                        : Number(e.target.value)
                    )
                  }
                  placeholder="Rp 0"
                  containerClassName="mb-0"
                />
              </div>
            </div>

            {/* DYNAMIC CUSTOM FEES LIST */}
            <div className="border-t border-gray-200/60 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Biaya Jasa Kustom Tambahan
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', amount: 0, notes: '' })}
                  className="h-7 text-[10px] gap-1 px-3 border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 rounded-sm font-semibold cursor-pointer"
                  icon={Plus}
                >
                  Tambah Biaya Kustom
                </Button>
              </div>

              {additionalCostsFields.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic">
                  Belum ada biaya kustom tambahan.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {additionalCostsFields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="flex flex-col md:flex-row items-end gap-3 bg-white p-3 border border-gray-100 rounded-sm shadow-sm relative group"
                    >
                      <div className="w-full md:w-[260px] flex-shrink-0">
                        <FormInput
                          label="Nama Biaya Jasa"
                          name={`additionalCosts.${idx}.name`}
                          value={
                            form.watch(`additionalCosts.${idx}.name`) || ''
                          }
                          onChange={(e: any) =>
                            form.setValue(
                              `additionalCosts.${idx}.name`,
                              e.target.value
                            )
                          }
                          placeholder="Misal: Sewa Coolbox, sewa mobil..."
                          className="h-9 text-xs"
                          containerClassName="mb-0"
                        />
                      </div>
                      <div className="w-full md:w-[180px] flex-shrink-0">
                        <FormInput
                          label="Jumlah Biaya (Rp)"
                          name={`additionalCosts.${idx}.amount`}
                          type="currency"
                          value={form.watch(`additionalCosts.${idx}.amount`)}
                          onChange={(e: any) =>
                            form.setValue(
                              `additionalCosts.${idx}.amount`,
                              typeof e.target.value === 'string'
                                ? Number(e.target.value.replace(/[^0-9]/g, ''))
                                : Number(e.target.value)
                            )
                          }
                          placeholder="Rp 0"
                          className="h-9 text-xs text-right"
                          containerClassName="mb-0"
                        />
                      </div>
                      <div className="w-full md:flex-1">
                        <FormInput
                          label="Keterangan (Opsional)"
                          name={`additionalCosts.${idx}.notes`}
                          value={
                            form.watch(`additionalCosts.${idx}.notes`) || ''
                          }
                          onChange={(e: any) =>
                            form.setValue(
                              `additionalCosts.${idx}.notes`,
                              e.target.value
                            )
                          }
                          placeholder="Catatan tambahan..."
                          className="h-9 text-xs"
                          containerClassName="mb-0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(idx)}
                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-sm cursor-pointer self-end flex-shrink-0"
                        icon={Trash2}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes & PPN grid */}
          {mode === 'invoice' ? (
            <div>
              <FormInput
                label="Catatan (Opsional)"
                icon={StickyNote}
                name="notes"
                value={form.watch('notes') || ''}
                onChange={(e: any) => form.setValue('notes', e.target.value)}
                placeholder="Tambahkan catatan, referensi nomor PO supplier, dll..."
                containerClassName="mb-0"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormInput
                  label="Catatan (Opsional)"
                  icon={StickyNote}
                  name="notes"
                  value={form.watch('notes') || ''}
                  onChange={(e: any) => form.setValue('notes', e.target.value)}
                  placeholder="Tambahkan catatan (opsional)..."
                  className="h-9"
                  containerClassName="mb-0"
                />
              </div>
              <div>
                <FormInput
                  label="PPN (%)"
                  icon={Percent}
                  type="number"
                  step="any"
                  name="taxPercent"
                  value={
                    form.watch('taxPercent') === 0
                      ? ''
                      : form.watch('taxPercent')
                  }
                  onChange={(e: any) =>
                    form.setValue(
                      'taxPercent',
                      e.target.value === '' ? 0 : Number(e.target.value)
                    )
                  }
                  placeholder="0"
                  className="h-9 font-bold"
                  containerClassName="mb-0"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      <DialogFooterSummary items={summaryItems}>
        <Button
          variant="ghost"
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:text-white rounded-sm font-bold px-6 h-9 text-xs"
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || fields.length === 0}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-sm font-bold px-6 gap-2 shadow-lg h-9 text-xs"
          isLoading={isSubmitting}
          icon={CheckCircle2}
        >
          Simpan
        </Button>
      </DialogFooterSummary>
    </form>
  );
}
