import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData
} from '@tanstack/react-query';
import api from '@/lib/api/api';
import { toast } from 'sonner';

export const useGetRTUPayments = (params?: {
  buyerId?: string;
  vendorId?: string;
  sellerId?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['rtu-payments', params],
    queryFn: async () => {
      const { data } = await api.get('/rtu/payment', { params });
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUPaymentById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['rtu-payments', id],
    queryFn: async () => {
      const { data } = await api.get(`/rtu/payment/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};

export const useCreateRTUPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/rtu/payment', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rtu-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      toast.success('Pembayaran berhasil dibuat');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal membuat pembayaran');
    }
  });
};

export const useCompleteRTUPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/rtu/payment/${id}/complete`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rtu-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      toast.success('Pembayaran berhasil diselesaikan');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Gagal menyelesaikan pembayaran'
      );
    }
  });
};

export const useCancelRTUPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.put(`/rtu/payment/${id}/cancel`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rtu-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      toast.success('Pembayaran berhasil dibatalkan');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Gagal membatalkan pembayaran'
      );
    }
  });
};

export const useGetRTUBanks = () => {
  return useQuery({
    queryKey: ['rtu-banks'],
    queryFn: async () => {
      const { data } = await api.get('/rtu/payment/banks');
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1
  });
};
