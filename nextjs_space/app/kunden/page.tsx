import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import KundenClient from './kunden-client';

export const dynamic = 'force-dynamic';

export default async function KundenPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/');
  }

  // Nur Admin, Admin Unternehmen und Projektleiter
  const role = session.user?.role?.toLowerCase() || '';
  const canAccess = ['admin', 'administrator', 'admin_organisation', 'projektleiter'].includes(role);
  
  if (!canAccess) {
    redirect('/tasks');
  }

  return <KundenClient />;
}
