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
import { ReusableSelect } from '@/components/ui/reusable-select';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { UNIT_LEVELS } from '@/lib/type/rtu_unit';

const formSchema = z.object({
  name: z.string().min(1, 'Nama Satuan required'),
  level: z.coerce.number().min(0).max(3).default(1)
});

export function AddUnitButton() {
  const { hasPermission: canCreate } = useGetPermission('create', 'rtu_unit');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      level: 1
    }
  });

  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      await api.post('/rtu/unit', values);
      queryClient.invalidateQueries({ queryKey: ['rtu-units'] });
      toast.success('Satuan berhasil ditambahkan');
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal merekam Satuan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" icon={Plus}>
          Tambah Satuan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md flex flex-col p-0 gap-0 bg-white rounded-sm shadow-xl border-t-4 border-indigo-500">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold text-gray-800">
            Tambah Satuan Baru
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
              label="Nama Satuan *"
              placeholder="Contoh: kg, gr, L, pcs, box, dll."
            />

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium leading-none text-gray-700">
                Level Hierarki *
              </label>
              <ReusableSelect
                showDefaultSelect={false}
                options={UNIT_LEVELS.map((l) => ({
                  label: `${l.label} (${l.example})`,
                  value: String(l.value)
                }))}
                value={String(form.watch('level') ?? 1)}
                onChange={(val) =>
                  form.setValue('level', Number(val), {
                    shouldValidate: true,
                    shouldDirty: true
                  })
                }
              />
              <p className="text-[11px] text-gray-400">
                {(() => {
                  const lvl = UNIT_LEVELS.find(
                    (l) => l.value === Number(form.watch('level') ?? 1)
                  );
                  return lvl ? `Contoh: ${lvl.example}` : '';
                })()}
              </p>
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
              {isLoading ? 'Menyimpan...' : 'Simpan Satuan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
