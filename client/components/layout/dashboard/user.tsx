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
}
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export function User() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      Cookies.remove('accessToken');
      Cookies.remove('ottodot_token');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('ottodot_token');

      toast.success('Logout successful!');
      router.push('/');
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Logout failed!');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="overflow-hidden rounded-full cursor-pointer"
        >
          <Image
            src="/placeholder-user.jpg"
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
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
