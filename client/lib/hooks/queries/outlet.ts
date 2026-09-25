// src/lib/hooks/queries/outlet.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { Outlet } from '@/lib/type/outlet';

/**
 * Ambil semua Outlet (aktif/nonaktif) dengan pagination dan pencarian
 * @param offset start index pagination
 * @param limit jumlah data per page
 * @param keyword string pencarian (nama, label, city, region)
 * @param isDeleted boolean filter data yang sudah soft delete
 */
export const useGetOutlets = (
  offset: number = 0,
  limit: number = 10,
  keyword: string = '',
  isDeleted: boolean = false,
  sortBy: string = '',
  desc: boolean = false,
  ignoreAccess: boolean = false
) => {
  return useQuery<{ data: Outlet[]; total: number } | any>({
    queryKey: [
      'outlets',
      offset,
      limit,
      keyword,
      isDeleted,
      sortBy,
      desc,
      ignoreAccess
    ],
    queryFn: async () => {
      const res = await api.get(`/outlet/all`, {
        params: {
          offset,
          limit,
          search: keyword,
          isDeleted,
          sortBy,
          desc,
          ignoreAccess
        }
      });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

/**
 * Ambil detail Outlet berdasarkan ID
 */
export const useGetOutlet = (outletId: string | undefined) => {
  return useQuery<Outlet | any>({
    queryKey: ['outlet', outletId],
    queryFn: async () => {
      const res = await api.get(`/outlet/${outletId}`);
      return res.data;
    },
    enabled: !!outletId,
    staleTime: 0,
    retry: 1
  });
};
