import UserEditClient from './user-edit-client';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function UserEditPage() {
  return <UserEditClient />;
}
