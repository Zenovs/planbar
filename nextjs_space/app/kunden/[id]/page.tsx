import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import KundenDetailClient from './kunden-detail-client';

export const dynamic = 'force-dynamic';

export default async function KundenDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/');
  }

  const role = session.user?.role?.toLowerCase() || '';
  const canAccess = ['admin', 'administrator', 'admin_organisation', 'projektleiter'].includes(role);
  
  if (!canAccess) {
    redirect('/tasks');
  }

  return <KundenDetailClient customerId={params.id} />;
}
