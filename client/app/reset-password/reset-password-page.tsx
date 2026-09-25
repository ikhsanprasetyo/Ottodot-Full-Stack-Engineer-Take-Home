'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { BackgroundImage } from '@/components/ui/background-image';
import { useResetPassword } from '@/lib/hooks/mutation/forgot-password';
import { FormInput } from '@/components/ui/form-input';

// Schema
const resetSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match'
  });

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  const { mutate: resetPassword, isPending } = useResetPassword();

  const handleReset = (data: { password: string }) => {
    if (!token) {
      toast.error('Invalid or missing token');
      return;
    }

    resetPassword(
      { data: { token, password: data.password } },
      {
        onSuccess: () => {
          toast.success('Password reset successfully');
          router.push('/');
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Failed to reset password');
        }
      }
    );
  };

  return (
    <BackgroundImage
      src="/bg-snt.jpg"
      alt="Background"
      overlayClassName="bg-black/30"
      className="flex items-center min-h-screen relative z-10 min-w-full"
    >
      <div className="min-h-screen p-6 w-full md:w-[500px] min-w-[400px] max-w-xl sm:max-w-xxl lg:max-w-[650px] relative flex flex-col items-center justify-center">
        {isPending && <LoadingSpinner />}
        <div className="flex justify-center mb-4">
          <Logo size="xxxl" />
        </div>
        <Card className="w-full max-w-md relative z-10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mt-2">Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>

          <form onSubmit={form.handleSubmit(handleReset)}>
            <CardContent className="grid gap-4">
              <FormInput
                label="Password"
                type="password"
                placeholder="••••••••"
                value={form.watch('password')}
                onChange={(e) => form.setValue('password', e.target.value)}
                showStrength
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}

              <FormInput
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={form.watch('confirmPassword')}
                onChange={(e) =>
                  form.setValue('confirmPassword', e.target.value)
                }
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                variant="green"
                type="submit"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? 'Resetting...' : 'Reset Password'}
              </Button>

              <Button
                type="button"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Back to login
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </BackgroundImage>
  );
}
