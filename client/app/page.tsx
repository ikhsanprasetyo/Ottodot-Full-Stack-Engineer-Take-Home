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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation'; // App Router
import { saveUserSession } from '@/lib/saveUserSession';
import { useLogin, useRegister } from '@/lib/hooks/mutation/auth';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useAuthRedirect } from '@/lib/hooks/useAuthRedirect';
import { Logo } from '@/components/ui/logo';
import { BackgroundImage } from '@/components/ui/background-image';
import Link from 'next/link';
import { FormInput } from '@/components/ui/form-input';
// Schema validation
const loginSchema = z.object({
  email: z
    .string()
    //.email('Invalid email address')
    .min(3, 'Must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const registerSchema = z
  .object({
    name: z.string().min(3, 'Username must be at least 1 character'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^\S+$/, 'Username must not contain spaces'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

export default function AuthPage() {
  useAuthRedirect(false, '/dashboard');
  const router = useRouter();
  // Initialize forms
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const { mutateAsync: login, isPending: isPendingLogin } = useLogin();
  const handleLogin = async (data: { email: string; password: string }) => {
    try {
      const res = await login(data); // ← pakai mutateAsync
      const user = res?.data;
      saveUserSession(user);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('last_location_update');
      }
      toast.success(`Welcome back ${user?.name || ''}! Login successful`);
      //console.log({ user });
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed', {
        duration: 4000
      });
      console.error('Login error:', error);
    }
  };

  const { mutateAsync: register, isPending: isPendingRegister } = useRegister();
  const handleRegister = async (data: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => {
    try {
      const res = await register(data);
      const user = res?.data;
      saveUserSession(user);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('last_location_update');
      }
      //console.log({ user });
      toast.success(`Welcome ${user?.name || ''}! Registration successful`);
      router.push('/dashboard');
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        (error.username === 'AbortError'
          ? 'Request timeout'
          : 'Registration failed');

      toast.error(message, { duration: 4000 });
      console.error('Register error:', error);
    }
  };

  return (
    <BackgroundImage
      src="/bg-snt.jpg"
      alt="Background"
      overlayClassName="bg-black/30"
      className="flex items-center min-h-screen relative z-10 min-w-full"
    >
      {(isPendingLogin || isPendingRegister) && <LoadingSpinner />}
      <div className="flex w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full flex justify-center">
          <Tabs
            defaultValue="login"
            className="
    w-full 
    max-w-full
    sm:max-w-md 
    md:max-w-lg 
    lg:max-w-[650px]
  "
          >
            <div className="flex justify-center mb-4">
              <Logo size="xl" />
            </div>
            <div>
              <p className="text-gray-100 mb-1 text-center text-2xl">
                Sistem Manajemen Produksi RTU
              </p>
              <p className="text-gray-100 mb-4 text-center text-2xl">
                Sinar Utama Mie Ayam Setiap Hari
              </p>
            </div>

            <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10 mb-0 rounded-b-none border-b-0 bg-white/95 border border-gray-200/80 shadow-sm backdrop-blur-md">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="mt-0">
              <Card className="flex flex-col rounded-t-none border-t-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Login</CardTitle>
                  <CardDescription>Enter your credentials</CardDescription>
                </CardHeader>

                <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                  <CardContent className="grid gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Username or Email</Label>
                      <Input
                        id="email"
                        type="text"
                        placeholder="john or john@example.com"
                        {...loginForm.register('email')}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-500">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <FormInput
                      label="Password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.watch('password')}
                      onChange={(e) =>
                        loginForm.setValue('password', e.target.value)
                      }
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter>
                    <div className="grid gap-2 w-full">
                      <Button
                        variant="green"
                        type="submit"
                        size="sm"
                        className="w-full"
                        disabled={loginForm.formState.isSubmitting}
                      >
                        {loginForm.formState.isSubmitting
                          ? 'Signing in...'
                          : 'Sign In'}
                      </Button>
                      <Link
                        href="/forgot-password"
                        className="text-center text-md text-blue-600 hover:underline"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="mt-0">
              <Card className="flex flex-col rounded-t-none border-t-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Register</CardTitle>
                  <CardDescription>Create new account</CardDescription>
                </CardHeader>

                <form onSubmit={registerForm.handleSubmit(handleRegister)}>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="JohnDoe"
                        {...registerForm.register('username')}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        {...registerForm.register('name')}
                      />
                      {registerForm.formState.errors.name && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        {...registerForm.register('email')}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <FormInput
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={registerForm.watch('password')}
                        onChange={(e) =>
                          registerForm.setValue('password', e.target.value)
                        }
                        showStrength
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <FormInput
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                        value={registerForm.watch('confirmPassword')}
                        onChange={(e) =>
                          registerForm.setValue(
                            'confirmPassword',
                            e.target.value
                          )
                        }
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500">
                          {
                            registerForm.formState.errors.confirmPassword
                              .message
                          }
                        </p>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button
                      variant="green"
                      type="submit"
                      size="sm"
                      className="w-full"
                      disabled={registerForm.formState.isSubmitting}
                    >
                      {registerForm.formState.isSubmitting
                        ? 'Creating account...'
                        : 'Create Account'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </BackgroundImage>
  );
}
