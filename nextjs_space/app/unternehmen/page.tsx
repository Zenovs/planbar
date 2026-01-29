import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UnternehmenClient from './unternehmen-client';

export const dynamic = 'force-dynamic';

export default async function UnternehmenPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  return <UnternehmenClient />;
}
