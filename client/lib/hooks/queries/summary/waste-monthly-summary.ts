import api from '@/lib/api/api';
import { useQuery } from '@tanstack/react-query';

export const useGetMonthlyWasteSummary = (
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
      'monthly-waste-summary',
      startDate,
      outlet,
      unit,
      productType,
      sourceType
    ],
    queryFn: async () => {
      const res = await api.get('/dtfc-summary/monthly-waste', {
        params: {
          startDate,
          outlet,
          topLimit,
          bottomLimit,
          unit,
          productType,
          sourceType
        }
      });
      return res.data;
    },
    enabled: !!startDate && !!outlet && enabled
  });
};
