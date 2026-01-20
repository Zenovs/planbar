import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SettingsClient from './settings-client';
import { canManageUsers, isAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Admins und Projektleiter haben Zugriff auf Settings
  // Projektleiter nur für Benutzer/Teams, Admins für alles
  if (!canManageUsers(session.user.role)) {
    redirect('/dashboard');
  }

  const userIsAdmin = isAdmin(session.user.role);

  return <SettingsClient isAdmin={userIsAdmin} />;
}
