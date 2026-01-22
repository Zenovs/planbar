import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import TeamClient from './team-client';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Mitglieder dürfen die Team-Seite nicht sehen
  if (session.user.role === 'Mitglied') {
    redirect('/tasks');
  }

  return <TeamClient />;
}
