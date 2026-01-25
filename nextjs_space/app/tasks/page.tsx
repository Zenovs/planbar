import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TasksClient } from './tasks-client';
import prisma from '@/lib/db';
import { isAdmin as checkIsAdmin, isKoordinatorOrHigher } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Get current user with role, team info and team memberships
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { 
      id: true, 
      role: true, 
      teamId: true, 
      name: true, 
      email: true,
      teamMemberships: { select: { teamId: true } }
    },
  });

  if (!currentUser) {
    redirect('/');
  }

  // Check if user is koordinator, projektleiter or admin
  const isKoordinator = isKoordinatorOrHigher(currentUser.role);
  const isAdmin = checkIsAdmin(currentUser.role);
  
  // Aus Datenschutzgründen sehen Admins keine Projekt-/Task-Details
  if (isAdmin) {
    redirect('/dashboard');
  }
  
  const canViewOthers = isKoordinator;

  // Collect all team IDs the user belongs to
  const userTeamIds: string[] = [];
  if (currentUser.teamId) userTeamIds.push(currentUser.teamId);
  currentUser.teamMemberships?.forEach(tm => {
    if (!userTeamIds.includes(tm.teamId)) userTeamIds.push(tm.teamId);
  });

  // Get team members if koordinator (Admin bereits ausgeschlossen)
  let teamMembers: { id: string; name: string | null; email: string }[] = [];
  if (canViewOthers) {
    if (isKoordinator && userTeamIds.length > 0) {
      // Koordinator sees team members from ALL their teams
      const teamMemberships = await prisma.teamMember.findMany({
        where: { teamId: { in: userTeamIds } },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      teamMembers = teamMemberships.map(tm => tm.user);
      
      // Also get users directly assigned to these teams
      const directTeamUsers = await prisma.user.findMany({
        where: { teamId: { in: userTeamIds } },
        select: { id: true, name: true, email: true },
      });
      
      // Merge and dedupe
      const allMembers = [...teamMembers, ...directTeamUsers];
      teamMembers = allMembers.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      
      // Admins aus der Liste ausschließen (Datenschutz)
      const adminRoles = ['admin', 'administrator'];
      const nonAdminMembers = await prisma.user.findMany({
        where: { 
          id: { in: teamMembers.map(m => m.id) },
          role: { notIn: adminRoles }
        },
        select: { id: true, name: true, email: true },
      });
      teamMembers = nonAdminMembers;
      
      // Sort by name
      teamMembers.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
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

  // Prepare currentUser for client (without teamMemberships)
  const currentUserForClient = {
    id: currentUser.id,
    role: currentUser.role,
    teamId: currentUser.teamId,
    name: currentUser.name,
    email: currentUser.email,
  };

  return (
    <TasksClient
      session={session}
      initialTasks={tasks}
      currentUser={currentUserForClient}
      teamMembers={teamMembers}
      canViewOthers={canViewOthers}
    />
  );
}
