'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, RefreshCcw } from 'lucide-react';

import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useGetUserProfile } from '@/lib/hooks/queries/user';
import { useUpdateUserProfile } from '@/lib/hooks/mutation/user';
import { useForgotPassword } from '@/lib/hooks/mutation/forgot-password';
import { setDateStr } from '@/lib/date';

export default function ProfilePage() {
  const router = useRouter();
  const { data, isLoading, error } = useGetUserProfile();
  const user = data?.data;

  const {
    mutate: forgotPassword,
    isPending: isPendingForgotPassword,
    isSuccess: isSuccessForgotPassword,
    isError: isErrorForgotPassword,
    error: errorForgotPassword
  } = useForgotPassword();
  const { mutate: updateProfile, isPending } = useUpdateUserProfile();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    role: '',
    phone: '',
    outlet: '',
    position: ''
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        role: user.role || '',
        phone: user.phone || '',
        outlet: user.outletDoc
          ? `${user.outletDoc.label} - ${user.outletDoc.type} - ${user.outletDoc.region}`
          : '',
        position: user.positionDoc?.label || ''
      });
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(
      {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        username: form.username.trim().toLowerCase(),
        phone: form.phone.trim(),
        outlet: form.outlet,
        position: form.position
      },
      {
        onSuccess: () => {
          toast.success('Profile updated successfully!');
          // Force refetch to update local state
          router.refresh();
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || 'Failed to update profile'
          );
        }
      }
    );
  };

  if (error)
    return <div className="p-4 text-red-500">Failed to load profile</div>;

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="flex w-full max-w-5xl mx-auto mt-4 gap-6">
        {/* Sidebar */}
        <div className="w-1/4 bg-white shadow-md rounded-sm p-4">
          <h2 className="font-bold mb-4">Settings</h2>
          <ul className="space-y-2">
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded-sm ${activeTab === 'profile' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
            </li>
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded-sm ${activeTab === 'security' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                onClick={() => setActiveTab('security')}
              >
                Security
              </button>
            </li>
          </ul>
        </div>

        {/* Content */}
        <div className="w-3/4 bg-white shadow-md rounded-sm p-6">
          {activeTab === 'profile' && (
            <>
              <h1 className="text-xl font-bold mb-4">My Profile</h1>
              <form onSubmit={handleSubmit} className="space-y-4">
                {['name', 'email', 'username', 'phone'].map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1 capitalize">
                      {key}
                    </label>
                    <input
                      type={key === 'email' ? 'email' : 'text'}
                      name={key}
                      value={(form as any)[key]}
                      onChange={handleChange}
                      className="w-full border px-3 py-2 rounded-sm"
                      required={key === 'name' || key === 'email'}
                    />
                  </div>
                ))}

                {['role', 'outlet', 'position'].map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1 capitalize">
                      {key}
                    </label>
                    <input
                      type="text"
                      name={key}
                      value={(form as any)[key]}
                      disabled
                      className="w-full border px-3 py-2 rounded-sm bg-gray-100 text-gray-500"
                    />
                  </div>
                ))}

                <div className="flex justify-end gap-3 border-t pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <Label>Forgot Password</Label>
              <Button
                type="button"
                variant="destructive"
                disabled={isPendingForgotPassword}
                onClick={() => forgotPassword({ data: { email: form.email } })}
                icon={
                  isPendingForgotPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )
                }
              >
                Reset password
              </Button>
              <div className="mt-2">
                {isSuccessForgotPassword && (
                  <p className="text-green-500">
                    Password reset link sent to {form.email}, please check your
                    email
                  </p>
                )}
                {isErrorForgotPassword && (
                  <p className="text-red-500">
                    {(errorForgotPassword as any)?.response?.data?.message ||
                      'Something went wrong'}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="mt-6 text-sm text-gray-500">
            <p>
              <strong>Created At:</strong>{' '}
              {setDateStr(user?.createdAt, 'dddd, DD MMM YYYY HH:mm')}
            </p>
            <p>
              <strong>Last Updated:</strong>{' '}
              {setDateStr(user?.updatedAt, 'dddd, DD MMM YYYY HH:mm')}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
