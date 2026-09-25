'use client';

import { useState } from 'react';
import { ShoppingCart, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PurchaseForm } from './purchase-form';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

interface AddPurchaseDialogProps {
  buyerOutletId: string;
}

export function AddPurchaseDialog({ buyerOutletId }: AddPurchaseDialogProps) {
  const { hasPermission: canCreate } = useGetPermission('create');
  const [open, setOpen] = useState(false);

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" size="action" icon={Plus}>
          Buat Purchase Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-[92vw] xl:max-w-[1400px] max-h-[95vh] overflow-hidden p-0 border-none shadow-3xl bg-white flex flex-col rounded-sm">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-sm">
              <ShoppingCart className="w-8 h-8 text-emerald-600" />
            </div>
            Form Purchase Order
          </DialogTitle>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2 pl-14">
            Permintaan stok dari outlet atau pembelian vendor
          </p>
        </DialogHeader>

        {open && (
          <PurchaseForm
            buyerOutletId={buyerOutletId}
            onClose={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
