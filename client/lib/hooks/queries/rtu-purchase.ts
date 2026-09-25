import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData
} from '@tanstack/react-query';
import api from '@/lib/api/api';
import { RTUPurchase } from '@/lib/type/rtu_purchase';
import { toast } from 'sonner';

interface GetPurchasesParams {
  buyerId?: string;
  sellerId?: string;
  vendorId?: string;
  status?: string;
  type?: string;
}

export const useGetRTUPurchases = (params?: GetPurchasesParams) => {
  return useQuery<RTUPurchase[]>({
    queryKey: ['rtu-purchases', params],
    queryFn: async () => {
      const response = await api.get('/rtu/purchase/all', { params });
      return response.data.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUPurchase = (id: string | undefined) => {
  return useQuery<RTUPurchase>({
    queryKey: ['rtu-purchase', id],
    queryFn: async () => {
      const response = await api.get(`/rtu/purchase/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};

export const useCreateRTUPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<RTUPurchase>) => {
      const response = await api.post('/rtu/purchase', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      toast.success('Purchase Order berhasil dibuat');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Gagal membuat Purchase Order'
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
    }
  });
};

export const useProcessRTUPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/rtu/purchase/process/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchase', id] });
      toast.success('PO diproses — stok penjual sudah dipotong');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Gagal memproses Purchase Order'
      );
    }
  });
};

export const useReceiveRTUPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/rtu/purchase/receive/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchase', id] });
      toast.success('Barang diterima — stok pembeli bertambah');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Gagal mengkonfirmasi penerimaan'
      );
    }
  });
};

export const useCancelRTUPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/rtu/purchase/cancel/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchase', id] });
      toast.success('Purchase Order dibatalkan');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Gagal membatalkan Purchase Order'
      );
    },
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchase', id] });
    }
  });
};
