'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { BackgroundImage } from '@/components/ui/background-image';
import { useForgotPassword } from '@/lib/hooks/mutation/forgot-password';

// Schema
const forgotSchema = z.object({
  email: z.string().email('Invalid email address')
});

export default function ForgotPasswordPage() {
  const form = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' }
  });

  const {
    mutate: forgotPassword,
    isPending,
    isSuccess: isSuccessForgotPassword
  } = useForgotPassword();

  const handleForgot = (data: { email: string }) => {
    forgotPassword({ data });
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
            <CardTitle className="text-2xl mt-2">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email to receive a reset link
            </CardDescription>
          </CardHeader>

          <form onSubmit={form.handleSubmit(handleForgot)}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex justify-start">
                {isSuccessForgotPassword && (
                  <p className="text-green-500">
                    Password reset link sent to {form.getValues('email')},
                    please check your email
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                variant="green"
                type="submit"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? 'Sending reset link...' : 'Send reset link'}
              </Button>

              <Button type="button" href="/" className="w-full">
                Back to login
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </BackgroundImage>
  );
}
