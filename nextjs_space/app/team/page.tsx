import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TeamClient } from './team-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: {
                in: ['open', 'in_progress'],
              },
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return <TeamClient users={users || []} currentUser={session.user} />;
}
