import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { RTUStockLedger } from '@/lib/type/rtu_stock_ledger';

export const useGetRTUStockLedgers = (params?: {
  materialId?: string;
  movementType?: string;
  outletId?: string;
  month?: string;
}) => {
  return useQuery<RTUStockLedger[]>({
    queryKey: ['rtu-stock-ledgers', params],
    queryFn: async () => {
      const response = await api.get('/rtu/ledger/all', { params });
      return response.data.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};
