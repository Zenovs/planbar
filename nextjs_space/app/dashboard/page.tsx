import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardClient } from './dashboard-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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

  // Default values if database queries fail
  let tickets: any[] = [];
  let users: any[] = [];
  let todaySubTasks: any[] = [];
  let currentUser: any = null;
  let stats = { total: 0, open: 0, inProgress: 0, done: 0 };

  try {
    // Get current user info
    currentUser = await prisma.user.findUnique({
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

    // Ticket visibility filter (same for stats and display)
    const ticketWhereClause = {
      OR: [
        { assignedToId: session.user.id },
        { createdById: session.user.id },
        ...(currentUser?.teamId ? [{ teamId: currentUser.teamId }] : []),
        ...(userTeamIds.length > 0 ? [{ teamId: { in: userTeamIds } }] : []),
      ],
    };

    // Berechne Start und Ende des heutigen Tages
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Separate query for stats (counts ALL tickets, not just 10)
    const [totalCount, openCount, inProgressCount, doneCount] = await Promise.all([
      prisma.ticket.count({ where: ticketWhereClause }).catch(() => 0),
      prisma.ticket.count({ where: { AND: [ticketWhereClause, { status: 'open' }] } }).catch(() => 0),
      prisma.ticket.count({ where: { AND: [ticketWhereClause, { status: 'in_progress' }] } }).catch(() => 0),
      prisma.ticket.count({ where: { AND: [ticketWhereClause, { status: 'done' }] } }).catch(() => 0),
    ]);

    stats = {
      total: totalCount,
      open: openCount,
      inProgress: inProgressCount,
      done: doneCount,
    };

    [tickets, users, todaySubTasks] = await Promise.all([
      // Only fetch last 10 tickets for display
      prisma.ticket.findMany({
        where: ticketWhereClause,
        include: {
          assignedTo: true,
          createdBy: true,
          category: true,
          subTasks: {
            select: {
              id: true,
              completed: true,
              estimatedHours: true,
            },
          },
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
      }).catch(() => []),
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
      }).catch(() => []),
      // Lade alle Subtasks die heute fällig sind und dem User zugewiesen sind
      prisma.subTask.findMany({
        where: {
          assigneeId: session.user.id,
          completed: false,
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          ticket: {
            include: {
              category: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      }).catch(() => []),
    ]);
  } catch (error) {
    console.error('Database query error:', error);
    // Continue with empty data
  }

  return (
    <DashboardClient
      session={session}
      stats={stats}
      recentTickets={tickets || []}
      users={users || []}
      todaySubTasks={todaySubTasks || []}
    />
  );
}
