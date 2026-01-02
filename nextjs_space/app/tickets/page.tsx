import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TicketsClient } from './tickets-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return <TicketsClient users={users || []} />;
}
