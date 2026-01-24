import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OrganisationClient from './organisation-client';

export const dynamic = 'force-dynamic';

export default async function OrganisationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  return <OrganisationClient />;
}
