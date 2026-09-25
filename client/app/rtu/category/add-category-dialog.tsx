'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus } from 'lucide-react';
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
import { useGetPermission } from '@/lib/hooks/useGetPermission';

const formSchema = z.object({
  name: z.string().min(1, 'Nama Kategori required')
});

export function AddCategoryButton() {
  const { hasPermission: canCreate } = useGetPermission(
    'create',
    'rtu_category'
  );
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: ''
    }
  });

  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      await api.post('/rtu/category', values);
      queryClient.invalidateQueries({ queryKey: ['rtu-categories'] });
      toast.success('Kategori berhasil ditambahkan');
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal merekam Kategori');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-sm h-12 px-6 gap-2 shadow-lg shadow-emerald-200/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="h-5 w-5" /> Tambah Kategori
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md flex flex-col p-0 gap-0 bg-white rounded-sm shadow-xl border-t-4 border-emerald-500">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold text-gray-800">
            Tambah Kategori Baru
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
              {isLoading ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
