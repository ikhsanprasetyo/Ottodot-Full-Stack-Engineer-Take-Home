import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { RTURecipe } from '@/lib/type/rtu_recipe';

export const useGetRTURecipeByProduct = (productId: string | undefined) => {
  return useQuery<{ data: RTURecipe } | any>({
    queryKey: ['rtu-recipes', productId],
    queryFn: async () => {
      const res = await api.get(`/rtu/recipe/by-product/${productId}`);
      return res.data;
    },
    enabled: !!productId,
    staleTime: 0,
    retry: 1
  });
};
