import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TasksClient } from './tasks-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Get current user with role and team info
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, teamId: true, name: true, email: true },
  });

  if (!currentUser) {
    redirect('/');
  }

  // Check if user is koordinator or admin
  const isKoordinator = ['koordinator', 'Koordinator'].includes(currentUser.role || '');
  const isAdmin = ['admin', 'Administrator', 'ADMIN'].includes(currentUser.role || '');
  const canViewOthers = isKoordinator || isAdmin;

  // Get team members if koordinator/admin
  let teamMembers: any[] = [];
  if (canViewOthers) {
    if (isAdmin) {
      // Admin sees all users
      teamMembers = await prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      });
    } else if (isKoordinator && currentUser.teamId) {
      // Koordinator sees team members
      const teamMemberships = await prisma.teamMember.findMany({
        where: { teamId: currentUser.teamId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      teamMembers = teamMemberships.map(tm => tm.user);
      
      // Also get users directly assigned to team
      const directTeamUsers = await prisma.user.findMany({
        where: { teamId: currentUser.teamId },
        select: { id: true, name: true, email: true },
      });
      
      // Merge and dedupe
      const allMembers = [...teamMembers, ...directTeamUsers];
      teamMembers = allMembers.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    }
  }

  // Get all tasks for current user by default
  const tasks = await prisma.subTask.findMany({
    where: {
      assigneeId: session.user.id,
    },
    include: {
      ticket: {
        include: {
          category: true,
        },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [
      { completed: 'asc' },
      { dueDate: 'asc' },
    ],
  });

  return (
    <TasksClient
      session={session}
      initialTasks={tasks}
      currentUser={currentUser}
      teamMembers={teamMembers}
      canViewOthers={canViewOthers}
    />
  );
}
