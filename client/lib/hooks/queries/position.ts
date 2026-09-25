import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { Position } from '@/lib/type/position';

/**
 * Ambil semua Position (aktif/nonaktif) dengan pagination dan pencarian
 * @param offset start index pagination
 * @param limit jumlah data per page
 * @param keyword string pencarian (nama, label, city, region)
 * @param isDeleted boolean filter data yang sudah soft delete
 */
export const useGetPositions = (
  offset: number = 0,
  limit: number = 10,
  keyword: string = '',
  isDeleted: boolean = false
) => {
  return useQuery<{ data: Position[]; total: number } | any>({
    queryKey: ['positions', offset, limit, keyword, isDeleted],
    queryFn: async () => {
      const res = await api.get(`/position/all`, {
        params: { offset, limit, search: keyword, isDeleted }
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
 * Ambil detail Position berdasarkan ID
 */
export const useGetPosition = (positionId: string | undefined) => {
  return useQuery<Position | any>({
    queryKey: ['position', positionId],
    queryFn: async () => {
      const res = await api.get(`/position/${positionId}`);
      return res.data;
    },
    enabled: !!positionId,
    staleTime: 0,
    retry: 1
  });
};
