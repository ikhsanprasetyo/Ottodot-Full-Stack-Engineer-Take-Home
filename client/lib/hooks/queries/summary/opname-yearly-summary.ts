import api from '@/lib/api/api';
import { useQuery } from '@tanstack/react-query';

export const useGetYearlyOpnameSummary = (
  startDate: string,
  outlet?: string,
  topLimit = 5,
  bottomLimit = 5,
  unit?: string,
  sourceType?: string,
  productType: string = 'material',
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: [
      'yearly-opname-summary',
      startDate,
      outlet,
      unit,
      sourceType,
      productType
    ],
    queryFn: async () => {
      const res = await api.get('/dtfc-summary/yearly-opname', {
        params: {
          startDate,
          outlet,
          topLimit,
          bottomLimit,
          unit,
          sourceType,
          productType
        }
      });
      return res.data;
    },
    enabled: !!startDate && !!outlet && enabled
  });
};
