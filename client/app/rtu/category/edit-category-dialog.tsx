'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { ReusableSelect } from '@/components/ui/reusable-select';
import { RTUCategory } from '@/lib/type/rtu_category';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

const formSchema = z.object({
  name: z.string().min(1, 'Nama Kategori required'),
  isActive: z.boolean()
});

export function EditCategoryButton({ category }: { category: RTUCategory }) {
  const { hasPermission: canUpdate } = useGetPermission(
    'update',
    'rtu_category'
  );
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category.name,
      isActive: category.isActive
    }
  });

  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      await api.put(`/rtu/category/${category._id}`, {
        ...values
      });
      queryClient.invalidateQueries({ queryKey: ['rtu-categories'] });
      toast.success('Kategori berhasil diupdate');
      setOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal update Kategori');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canUpdate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-sm"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md flex flex-col p-0 gap-0 bg-white rounded-sm shadow-xl border-t-4 border-blue-500">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold text-gray-800">
            Edit Kategori
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="p-6 space-y-4">
            <FormInput
              form={form}
              name="name"
              label="Nama Kategori *"
              placeholder="Contoh: Mentah, Matang, dll."
            />

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium leading-none text-gray-700">
                Status *
              </label>
              <ReusableSelect
                showDefaultSelect={false}
                options={[
                  { label: 'Aktif', value: 'true' },
                  { label: 'Non-Aktif', value: 'false' }
                ]}
                value={String(form.watch('isActive'))}
                onChange={(val) => {
                  form.setValue('isActive', val === 'true', {
                    shouldValidate: true,
                    shouldDirty: true
                  });
                }}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-gray-600 rounded-sm"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="rounded-sm"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
