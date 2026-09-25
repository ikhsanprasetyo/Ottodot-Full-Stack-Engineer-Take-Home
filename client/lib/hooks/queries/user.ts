import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { UserSessionData } from '@/lib/type/user-session'; // optional typing

// Contoh pemanggilan:
// const { data, isLoading, error } = useGetUsers(offset, limit, keyword);
export const useGetUsers = (
  offset: number = 0,
  limit: number = 10,
  search: string = '',
  enabled: boolean = true,
  showDeleted: boolean = false,
  sort: string = '',
  order: string = ''
) => {
  return useQuery<any>({
    queryKey: ['users', offset, limit, search, showDeleted, sort, order],
    queryFn: async () => {
      const res = await api.get<UserSessionData[]>('/user/all', {
        params: {
          offset,
          limit,
          search,
          show_deleted: showDeleted,
          sort,
          order
        }
      });
      return res.data;
    },
    refetchIntervalInBackground: true, // refresh setiap 5 detik
    refetchInterval: 5000,
    retry: 1,
    staleTime: 0,
    enabled: enabled
  });
};

/**
 * Ambil user berdasarkan ID
 * @example const { data, isLoading, error } = useGetUser(userId);
 */
export const useGetUser = (userId: string | undefined) => {
  return useQuery<{ success: boolean; data: UserSessionData }>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: UserSessionData }>(
        `/user/${userId}`
      );
      return res.data;
    },
    enabled: !!userId, // hanya jalankan jika userId ada
    staleTime: 1000 * 60 * 0, // cache valid selama 1 menit
    retry: 1
  });
};

/**
 * Ambil profil user yang sedang login
 * @example const { data, isLoading, error } = useGetUserProfile();
 */
export const useGetUserProfile = () => {
  return useQuery<{ success: boolean; data: UserSessionData }>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: UserSessionData }>(
        '/user/profile'
      );
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // cache selama 5 menit
    placeholderData: keepPreviousData, // tampilkan data lama saat refetch agar permission tidak "flicker"
    retry: 1 // coba ulang sekali jika gagal
  });
};

/**
 * Ambil data riwayat pengguna online berdasarkan timeframe
 * @example const { data, isLoading } = useGetUserOnlineHistory(timeframe);
 */
export const useGetUserOnlineHistory = (timeframe: string = '1d') => {
  return useQuery<any>({
    queryKey: ['user-online-history', timeframe],
    queryFn: async () => {
      const res = await api.get<any>('/user/online-history', {
        params: { timeframe }
      });
      return res.data;
    },
    refetchInterval: 10000, // refresh setiap 10 detik
    retry: 1
  });
};

/**
 * Ambil statistik ringkasan pengguna (total, online, baru)
 * @example const { data, isLoading } = useGetUserStats();
 */
export const useGetUserStats = () => {
  return useQuery<any>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const res = await api.get<any>('/user/stats');
      return res.data;
    },
    refetchInterval: 10000, // refresh setiap 10 detik
    retry: 1
  });
};
