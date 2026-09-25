import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { toast } from 'sonner';

export interface PriceBackupRecord {
  _id: string;
  entityType: 'MATERIAL' | 'PRODUCT';
  targetOutletId: string;
  targetOutlet?: {
    _id: string;
    name: string;
  };
  sourceOutletId?: string;
  sourceOutlet?: {
    _id: string;
    name: string;
  };
  notes?: string;
  backupData: string;
  createdBy?: string;
  creator?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

// Get price backups for material
export const useGetMaterialPriceBackups = (targetOutletId?: string) => {
  return useQuery<{ data: PriceBackupRecord[] }>({
    queryKey: ['rtu-material-backups', targetOutletId],
    queryFn: async () => {
      const res = await api.get('/rtu/material/backups', {
        params: { target_outlet_id: targetOutletId }
      });
      return res.data;
    },
    staleTime: 0
  });
};

// Get price backups for product
export const useGetProductPriceBackups = (targetOutletId?: string) => {
  return useQuery<{ data: PriceBackupRecord[] }>({
    queryKey: ['rtu-product-backups', targetOutletId],
    queryFn: async () => {
      const res = await api.get('/rtu/product/backups', {
        params: { target_outlet_id: targetOutletId }
      });
      return res.data;
    },
    staleTime: 0
  });
};

// Copy Material Prices
export const useCopyMaterialPrices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      sourceOutletId: string;
      targetOutletId: string;
      notes?: string;
    }) => {
      const res = await api.post('/rtu/material/copy-prices', payload);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Berhasil menyalin harga material!');
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-material-backups'] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Gagal menyalin harga material'
      );
    }
  });
};

// Restore Material Price Backup
export const useRestoreMaterialPriceBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (backupId: string) => {
      const res = await api.post(`/rtu/material/restore-backup/${backupId}`);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(
        res.message || 'Berhasil melakukan rollback harga material!'
      );
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-material-backups'] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Gagal merestore backup harga material'
      );
    }
  });
};

// Copy Product Prices
export const useCopyProductPrices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      sourceOutletId: string;
      targetOutletId: string;
      notes?: string;
    }) => {
      const res = await api.post('/rtu/product/copy-prices', payload);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Berhasil menyalin harga produk!');
      queryClient.invalidateQueries({ queryKey: ['rtu-products'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-product-backups'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyalin harga produk');
    }
  });
};

// Restore Product Price Backup
export const useRestoreProductPriceBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (backupId: string) => {
      const res = await api.post(`/rtu/product/restore-backup/${backupId}`);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Berhasil melakukan rollback harga produk!');
      queryClient.invalidateQueries({ queryKey: ['rtu-products'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-product-backups'] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Gagal merestore backup harga produk'
      );
    }
  });
};
