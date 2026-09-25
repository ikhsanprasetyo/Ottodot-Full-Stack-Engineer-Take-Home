'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Globe, Link2 } from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import { SiShopee } from 'react-icons/si';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { LocationSelector } from '@/components/shared/location-selector';

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
import { Authorized } from '@/components/ui/authorized';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { useGetRTUBanks } from '@/lib/hooks/queries/rtu-payment';
import { BankAccounts } from '@/components/ui/bank-accounts';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import { useGetRTUCategories } from '@/lib/hooks/queries/rtu-category';
import { ReusableSelect } from '@/components/ui/reusable-select';

// ─── Link Platform Config ────────────────────────────────────────────────────

const LINK_TYPE_OPTIONS = [
  { value: 'shopee', label: 'Shopee' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tokopedia', label: 'Tokopedia' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Link Lainnya' }
];

const LINK_URL_PLACEHOLDER: Record<string, string> = {
  shopee: 'https://shopee.co.id/namatoko',
  instagram: 'https://instagram.com/username',
  tokopedia: 'https://www.tokopedia.com/namatoko',
  website: 'https://www.namavendor.com',
  other: 'https://...'
};

// Tokopedia icon menggunakan aset logo PNG lokal
function TokopediaIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/tokopedia.png"
      alt="Tokopedia"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

function LinkPlatformIcon({ type }: { type: string }) {
  const cls = 'w-4 h-4 shrink-0';
  switch (type) {
    case 'shopee':
      return <SiShopee className={cls} style={{ color: '#EE4D2D' }} />;
    case 'instagram':
      return <FaInstagram className={cls} style={{ color: '#E1306C' }} />;
    case 'tokopedia':
      return <TokopediaIcon className={cls} />;
    case 'website':
      return <Globe className={cls + ' text-indigo-500'} />;
    default:
      return <Link2 className={cls + ' text-gray-400'} />;
  }
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const formSchema = z.object({
  code: z.string().min(1, 'Code required'),
  name: z.string().min(1, 'Name required'),
  category: z.string().optional(),
  contacts: z
    .array(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional()
      })
    )
    .default([]),
  links: z
    .array(
      z.object({
        type: z.string().min(1),
        url: z.string().min(1, 'URL wajib diisi'),
        label: z.string().optional()
      })
    )
    .default([]),
  paymentTermDays: z.preprocess(
    (val) =>
      val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0, 'Must be positive').optional()
  ),
  notes: z.string().optional(),
  branches: z
    .array(
      z.object({
        name: z.string().min(1, 'Nama cabang wajib diisi'),
        googleMapsUrl: z.string().optional(),
        latitude: z.preprocess(
          (val) =>
            val === '' || val === null || val === undefined
              ? undefined
              : Number(val),
          z.number().optional()
        ),
        longitude: z.preprocess(
          (val) =>
            val === '' || val === null || val === undefined
              ? undefined
              : Number(val),
          z.number().optional()
        ),
        province: z.string().optional(),
        city: z.string().optional(),
        address: z.string().optional()
      })
    )
    .min(1, 'Minimal harus ada 1 cabang'),
  bankAccounts: z
    .array(
      z.object({
        bankName: z.string().min(1, 'Nama Bank wajib diisi'),
        accountNumber: z.string().min(1, 'Nomor Rekening wajib diisi'),
        accountHolder: z.string().min(1, 'Nama Penerima wajib diisi'),
        isDefault: z.boolean().optional().default(false)
      })
    )
    .default([])
});

// ─── Component ───────────────────────────────────────────────────────────────

export function AddVendorButton() {
  const { hasPermission: canCreate } = useGetPermission('create');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: banksData } = useGetRTUBanks();
  const bankOptions = useMemo(() => {
    return (banksData?.data || []).map((b: any) => ({
      label: b.label,
      value: b.label
    }));
  }, [banksData]);

  const { data: vendorsData } = useGetRTUVendors('', true);
  const { data: categoryData } = useGetRTUCategories('', true);

  const suggestedCode = useMemo(() => {
    const list = vendorsData?.data || [];
    if (list.length === 0) return 'VND-001';
    let maxNum = 0;
    list.forEach((v: any) => {
      const c = v.code || '';
      const match = c.match(/VND-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `VND-${String(maxNum + 1).padStart(3, '0')}`;
  }, [vendorsData]);

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      category: 'general',
      contacts: [{ name: '', phone: '', email: '' }],
      links: [],
      paymentTermDays: '',
      notes: '',
      bankAccounts: [],
      branches: [
        {
          name: 'Utama',
          googleMapsUrl: '',
          latitude: '',
          longitude: '',
          province: '',
          city: '',
          address: ''
        }
      ]
    }
  });

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact
  } = useFieldArray({ control: form.control, name: 'contacts' });

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink
  } = useFieldArray({ control: form.control, name: 'links' });

  const {
    fields: branchFields,
    append: appendBranch,
    remove: removeBranch
  } = useFieldArray({ control: form.control, name: 'branches' });

  useEffect(() => {
    if (open && suggestedCode) {
      const currentCodeVal = form.getValues('code');
      if (!currentCodeVal) {
        form.setValue('code', suggestedCode);
      }
    }
  }, [open, suggestedCode, form]);

  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      const payload = {
        ...values,
        contacts:
          values.contacts?.filter((c: any) => c.name || c.phone || c.email) ||
          [],
        links: values.links?.filter((l: any) => l.url) || []
      };
      await api.post('/rtu/vendor', payload);
      await queryClient.invalidateQueries({
        queryKey: ['rtu-vendors'],
        exact: false
      });
      toast.success('Vendor berhasil ditambahkan');
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal merekam Vendor');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCreate) return null;

  return (
    <Authorized action="create">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="primary" icon={Plus}>
            Tambah Vendor
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 bg-white rounded-sm shadow-xl border-t-4 border-blue-600">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-bold text-gray-800">
              Tambah Vendor Baru
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Kode & Nama */}
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  form={form}
                  name="code"
                  label="Kode Vendor *"
                  placeholder="VND-001"
                  suggestedValue={suggestedCode}
                />
                <FormInput
                  form={form}
                  name="name"
                  label="Nama Vendor *"
                  placeholder="PT Sinar Supplier"
                />
              </div>

              {/* Kategori & Payment Term */}
              <div className="grid grid-cols-2 gap-4">
                <ReusableSelect
                  form={form}
                  name="category"
                  label="Kategori"
                  showDefaultSelect
                  options={
                    categoryData?.data?.map((c: any) => ({
                      label: c.name,
                      value: c.name
                    })) || []
                  }
                  value={form.watch('category') || ''}
                  onChange={(val) => {
                    form.setValue('category', val, {
                      shouldValidate: true,
                      shouldDirty: true
                    });
                  }}
                  placeholder="Pilih Kategori..."
                  searchable
                />
                <FormInput
                  form={form}
                  name="paymentTermDays"
                  label="Payment Term (Hari) (Opsional)"
                  placeholder="30"
                  type="number"
                />
              </div>

              {/* ── Daftar Kontak ─────────────────────────────────── */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Daftar Kontak
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Nama, nomor HP, dan email per kontak
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      appendContact({ name: '', phone: '', email: '' })
                    }
                    className="h-7 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-[11px]"
                  >
                    + Tambah Kontak
                  </Button>
                </div>

                {contactFields.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">
                    Belum ada kontak ditambahkan
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="grid grid-cols-3 gap-2 px-0">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        Nama Kontak
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        Nomor HP
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        Email
                      </span>
                    </div>
                    {contactFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-center">
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          <FormInput
                            form={form}
                            name={`contacts.${index}.name`}
                            placeholder="Nama (misal: Budi)"
                            containerClassName="!mb-0"
                          />
                          <FormInput
                            form={form}
                            name={`contacts.${index}.phone`}
                            placeholder="0812xxx"
                            containerClassName="!mb-0"
                          />
                          <FormInput
                            form={form}
                            name={`contacts.${index}.email`}
                            type="email"
                            placeholder="email@vendor.com"
                            containerClassName="!mb-0"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-9 w-9 p-0 flex items-center justify-center rounded-sm shrink-0"
                          onClick={() => removeContact(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Links Toko / Media Sosial ─────────────────────── */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Links Toko & Media Sosial
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Shopee, Instagram, Tokopedia, Website, dll.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      appendLink({ type: 'shopee', url: '', label: '' })
                    }
                    className="h-7 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-[11px]"
                  >
                    + Tambah Link
                  </Button>
                </div>

                {linkFields.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">
                    Belum ada link ditambahkan
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkFields.map((field, index) => {
                      const linkType = form.watch(`links.${index}.type`);
                      return (
                        <div key={field.id} className="space-y-1.5">
                          <div className="flex gap-2 items-center">
                            {/* Platform Icon Badge */}
                            <div className="flex items-center justify-center h-9 w-9 rounded-sm bg-gray-50 border border-gray-200 shrink-0 mt-0">
                              <LinkPlatformIcon type={linkType} />
                            </div>

                            {/* Platform Type */}
                            <div className="w-36 shrink-0">
                              <ReusableSelect
                                name={`links.${index}.type`}
                                options={LINK_TYPE_OPTIONS}
                                value={linkType || 'shopee'}
                                onChange={(val) =>
                                  form.setValue(`links.${index}.type`, val, {
                                    shouldValidate: true,
                                    shouldDirty: true
                                  })
                                }
                                placeholder="Platform"
                              />
                            </div>

                            {/* URL Input */}
                            <FormInput
                              form={form}
                              name={`links.${index}.url`}
                              placeholder={
                                LINK_URL_PLACEHOLDER[linkType] || 'https://...'
                              }
                              containerClassName="flex-1 !mb-0"
                            />

                            {/* Delete */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-9 w-9 p-0 flex items-center justify-center rounded-sm shrink-0"
                              onClick={() => removeLink(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {linkType === 'other' && (
                            <div className="pl-11">
                              <FormInput
                                form={form}
                                name={`links.${index}.label`}
                                placeholder="Nama platform"
                                containerClassName="w-72 !mb-0"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Cabang Vendor (Multi-Branch) ─────────────────────── */}
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Daftar Cabang Vendor
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Tambahkan satu atau lebih cabang operasional vendor
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      appendBranch({
                        name: `Cabang ${branchFields.length + 1}`,
                        googleMapsUrl: '',
                        latitude: '',
                        longitude: '',
                        province: '',
                        city: '',
                        address: ''
                      })
                    }
                    className="h-7 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-[11px]"
                  >
                    + Tambah Cabang
                  </Button>
                </div>

                {branchFields.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">
                    Belum ada cabang ditambahkan (minimal harus ada 1 cabang)
                  </p>
                ) : (
                  <div className="space-y-6">
                    {branchFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="border border-gray-200 rounded-sm p-4 bg-gray-50/20 relative space-y-4"
                      >
                        {/* Header & Remove Button */}
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <div className="w-72">
                            <FormInput
                              form={form}
                              name={`branches.${index}.name`}
                              label={`Nama Cabang #${index + 1}`}
                              placeholder="Misal: Medan Sriwijaya, Jakarta Barat..."
                            />
                          </div>
                          {branchFields.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-8 px-3 flex items-center gap-1 rounded-sm text-xs font-semibold"
                              onClick={() => removeBranch(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Hapus Cabang
                            </Button>
                          )}
                        </div>

                        {/* LocationSelector for this branch */}
                        <LocationSelector
                          form={form}
                          namePrefix={`branches.${index}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FormInput
                form={form}
                name="notes"
                label="Catatan"
                placeholder="Opsional"
                rows={3}
              />

              {/* Rekening Bank */}
              <BankAccounts form={form} bankOptions={bankOptions} size="sm" />
            </div>

            <div className="p-4 px-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3 rounded-b-sm shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Batal
              </Button>
              <Button type="submit" isLoading={isLoading} variant="primary">
                {isLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Authorized>
  );
}
