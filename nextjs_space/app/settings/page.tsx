import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SettingsClient from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Nur Admins haben Zugriff auf Settings
  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <SettingsClient />;
}
