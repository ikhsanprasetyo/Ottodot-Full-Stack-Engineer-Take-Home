import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/api';

export interface RTUMonthlyHPP {
  _id: string;
  outletId: string;
  monthYear: string;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  createdAt: string;
  updatedAt: string;
  creator?: any;
  histories?: any[];
}

export const useGetAllRTUMonthlyHPP = (outletId: string, year?: string) => {
  return useQuery({
    queryKey: ['rtu-monthly-hpp-all', outletId, year],
    queryFn: async () => {
      if (!outletId) return null;
      const params: any = { outletId };
      if (year) params.year = year;

      const response = await api.get('/rtu/hpp/all', {
        params
      });
      return response.data;
    },
    enabled: !!outletId,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1
  });
};

export const useGetRTUHppMatrix = (year: string) => {
  return useQuery({
    queryKey: ['rtu-monthly-hpp-matrix', year],
    queryFn: async () => {
      const response = await api.get('/rtu/hpp/matrix', {
        params: { year }
      });
      return response.data;
    },
    enabled: !!year,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1
  });
};

export const useGetRTUMonthlyHPP = (outletId: string, monthYear: string) => {
  return useQuery({
    queryKey: ['rtu-monthly-hpp', outletId, monthYear],
    queryFn: async () => {
      if (!outletId || !monthYear) return null;
      const response = await api.get('/rtu/hpp', {
        params: { outletId, monthYear }
      });
      return response.data;
    },
    enabled: !!outletId && !!monthYear,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1
  });
};
