import api from '@/lib/api/api';
import { Outlet } from '@/lib/type/outlet';
import {
  UseMutationOptions,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';

type CreateOutletInput = Omit<Outlet, '_id' | 'createdAt' | 'updatedAt'>;

export const useCreateOutlet = (
  options?: UseMutationOptions<any, Error, CreateOutletInput>
) => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, CreateOutletInput>({
    mutationFn: async (data) => {
      const res = await api.post('/outlet', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    },
    ...options
  });
};

export const useUpdateOutlet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ _id, ...data }: Partial<Outlet> & { _id: string }) => {
      const res = await api.put(`/outlet/${_id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    }
  });
};

export const useDeleteOutlet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/outlet/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    }
  });
};

export const useRestoreOutlet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/outlet/restore/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    }
  });
};
