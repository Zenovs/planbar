import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import KostenClient from './kosten-client';

export const dynamic = 'force-dynamic';

export default async function KostenPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Nur Admins haben Zugriff
  if (session.user.role !== 'admin') {
    redirect('/tasks');
  }

  return <KostenClient />;
}
