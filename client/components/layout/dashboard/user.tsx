'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation'; // App Router
import { getApi } from '@/lib/utils';
import Cookies from 'js-cookie';
import { useGetUserProfile } from '@/lib/hooks/queries/user';
import { useGoToPage } from '@/lib/hooks/useGoToPage';

export function User() {
  const router = useRouter();
  const { data } = useGetUserProfile();
  const user = data?.data;

  const handleLogout = async () => {
    try {
      await fetch(`${getApi()}/user/logout`, {
        method: 'POST',
        credentials: 'include' // untuk hapus HttpOnly refreshToken di server
      });

      // Hapus cookies (bisa diakses dari JS)
      Cookies.remove('accessToken');
      Cookies.remove('accessTokenExpiresAt');

      // Bersihkan sessionStorage
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('user');

      if (typeof window !== 'undefined') {
        localStorage.removeItem('last_location_update');
      }

      toast.success('Logout successful!');
      router.push('/');
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Logout failed!');
    }
  };

  const goToPage = useGoToPage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="overflow-hidden rounded-full"
        >
          <Image
            src={user?.image ?? '/placeholder-user.jpg'}
            width={36}
            height={36}
            alt="Avatar"
            className="overflow-hidden rounded-full"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => goToPage('/profile')}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user ? (
          <DropdownMenuItem onClick={handleLogout}>Sign Out</DropdownMenuItem>
        ) : (
          <DropdownMenuItem>
            <Link href="/login">Sign In</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
