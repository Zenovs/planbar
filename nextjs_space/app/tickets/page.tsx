import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProjektsClient } from './tickets-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('Session error:', error);
    redirect('/');
  }

  if (!session?.user) {
    redirect('/');
  }

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (error) {
    console.error('Database error:', error);
  }

  return <ProjektsClient users={users || []} />;
}
