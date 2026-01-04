import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import SettingsClient from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Only admins can access settings
  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <SettingsClient />;
}