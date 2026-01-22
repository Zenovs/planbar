import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AdminDashboard } from './admin-dashboard';
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

  // Get current user with role
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  // Only admin can access dashboard - redirect others to tasks
  if (currentUser?.role !== 'admin') {
    redirect('/tasks');
  }

  // Get system statistics for admin dashboard
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersThisWeek,
    totalProjects,
    newProjectsThisMonth,
    newProjectsThisWeek,
    openProjects,
    inProgressProjects,
    doneProjects,
    totalTasks,
    openTasks,
    completedTasks,
    totalTeams,
    usersWithTeam,
    recentLogins,
  ] = await Promise.all([
    // Users
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    // Projects (Tickets)
    prisma.ticket.count(),
    prisma.ticket.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.ticket.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.ticket.count({ where: { status: 'open' } }),
    prisma.ticket.count({ where: { status: 'in_progress' } }),
    prisma.ticket.count({ where: { status: 'done' } }),
    // Tasks (SubTasks)
    prisma.subTask.count(),
    prisma.subTask.count({ where: { completed: false } }),
    prisma.subTask.count({ where: { completed: true } }),
    // Teams
    prisma.team.count(),
    prisma.user.count({ where: { teamId: { not: null } } }),
    // Recent activity - users updated in last 24h (approximation for logins)
    prisma.user.count({ where: { updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
  ]);

  // Get recent projects
  const recentProjects = await prisma.ticket.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true, email: true } },
      assignedTo: { select: { name: true, email: true } },
    },
  });

  // Get recent users
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  // User role distribution
  const roleDistribution = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true },
  });

  const stats = {
    users: {
      total: totalUsers,
      newThisMonth: newUsersThisMonth,
      newThisWeek: newUsersThisWeek,
      withTeam: usersWithTeam,
      recentLogins,
    },
    projects: {
      total: totalProjects,
      newThisMonth: newProjectsThisMonth,
      newThisWeek: newProjectsThisWeek,
      open: openProjects,
      inProgress: inProgressProjects,
      done: doneProjects,
    },
    tasks: {
      total: totalTasks,
      open: openTasks,
      completed: completedTasks,
    },
    teams: {
      total: totalTeams,
    },
    roleDistribution: roleDistribution.map((r) => ({
      role: r.role,
      count: r._count.role,
    })),
  };

  return (
    <AdminDashboard
      stats={stats}
      recentProjects={recentProjects}
      recentUsers={recentUsers}
    />
  );
}
