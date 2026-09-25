import { useMutation } from '@tanstack/react-query';
import { apiNoRefreshPost } from '@/lib/api/apiNoRefresh';

type ForgotPasswordPayload = {
  email: string;
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async ({ data }: { data: ForgotPasswordPayload }) => {
      const res = await apiNoRefreshPost('/user/forgot-password', data);
      return res.data;
    },

    onError: (error: any) => {
      console.error('Forgot password error:', error.response?.data || error);
    }
  });
};

type ResetPasswordPayload = {
  token: string; // reset token yang dikirim via email (params atau query)
  password: string;
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ data }: { data: ResetPasswordPayload }) => {
      const res = await apiNoRefreshPost(
        `/user/reset-password/${data.token}`,
        data
      );
      return res.data;
    },

    onError: (error: any) => {
      console.error('Reset password error:', error.response?.data || error);
    }
  });
};
