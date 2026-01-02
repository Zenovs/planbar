import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardClient } from './dashboard-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const [tickets, users] = await Promise.all([
    prisma.ticket.findMany({
      include: {
        assignedTo: true,
        createdBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    }),
    prisma.user.findMany({
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
    }),
  ]);

  const stats = {
    total: tickets?.length || 0,
    open: tickets?.filter((t: any) => t?.status === 'open')?.length || 0,
    inProgress: tickets?.filter((t: any) => t?.status === 'in_progress')?.length || 0,
    done: tickets?.filter((t: any) => t?.status === 'done')?.length || 0,
  };

  return (
    <DashboardClient
      session={session}
      stats={stats}
      recentTickets={tickets || []}
      users={users || []}
    />
  );
}
