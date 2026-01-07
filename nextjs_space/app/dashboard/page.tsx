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

  // Get current user info
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, teamId: true },
  });

  // Get user's team memberships (for TeamMember model if exists)
  const userTeamMemberships = await prisma.teamMember.findMany({
    where: { userId: session.user.id },
    select: { teamId: true },
  }).catch(() => []);
  const userTeamIds = userTeamMemberships.map((tm: { teamId: string }) => tm.teamId);

  // User visibility logic:
  // - Admins see all users
  // - Users without team see only themselves
  // - Users with team see only team members
  let userWhereClause = {};
  if (currentUser?.role !== 'admin') {
    if (!currentUser?.teamId) {
      userWhereClause = { id: session.user.id };
    } else {
      userWhereClause = { teamId: currentUser.teamId };
    }
  }

  const [tickets, users] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        OR: [
          { assignedToId: session.user.id },
          { createdById: session.user.id },
          ...(currentUser?.teamId ? [{ teamId: currentUser.teamId }] : []),
          ...(userTeamIds.length > 0 ? [{ teamId: { in: userTeamIds } }] : []),
        ],
      },
      include: {
        assignedTo: true,
        createdBy: true,
        category: true,
        _count: {
          select: {
            subTasks: {
              where: {
                completed: false,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    }),
    prisma.user.findMany({
      where: userWhereClause,
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
