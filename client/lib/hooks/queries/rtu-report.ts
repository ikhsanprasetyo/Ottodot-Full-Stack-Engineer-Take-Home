import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/api';

interface ReportSummaryParams {
  outletId?: string;
  month?: string; // YYYY-MM
}

export const useGetRTUReportSummary = (params?: ReportSummaryParams) => {
  return useQuery({
    queryKey: ['rtu-report-summary', params?.outletId, params?.month],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.outletId) query.set('outletId', params.outletId);
      if (params?.month) query.set('month', params.month);
      const qs = query.toString();
      const response = await api.get(
        `/rtu/report/summary${qs ? `?${qs}` : ''}`
      );
      return response.data.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1
  });
};
