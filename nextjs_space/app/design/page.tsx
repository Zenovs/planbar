import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DesignClient from './design-client';

export const dynamic = 'force-dynamic';

export default async function DesignPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/');
  }

  return <DesignClient />;
}
