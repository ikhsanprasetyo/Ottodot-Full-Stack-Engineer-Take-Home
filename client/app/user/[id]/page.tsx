import { redirect } from 'next/navigation';

export function generateStaticParams() {
  return [{ id: '1' }, { id: 'refresh-token' }];
}

export default function UserRedirectPage() {
  redirect('/dashboard');
}
