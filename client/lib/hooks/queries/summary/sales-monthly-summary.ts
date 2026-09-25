import api from '@/lib/api/api';
import { useQuery } from '@tanstack/react-query';

export const useGetMonthlySalesSummary = (
  startDate: string,
  outlet?: string,
  topLimit = 5,
  bottomLimit = 5,
  productType?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['monthly-sales-summary', startDate, outlet, productType],
    queryFn: async () => {
      const res = await api.get('/dtfc-summary/monthly-sales', {
        params: { startDate, outlet, topLimit, bottomLimit, productType }
      });
      return res.data;
    },
    enabled: !!startDate && !!outlet && enabled
  });
};
