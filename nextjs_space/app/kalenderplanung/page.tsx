import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { CalendarPlanningClient } from './calendar-planning-client';
import { isAdmin as checkIsAdmin, isKoordinatorOrHigher } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export default async function CalendarPlanningPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      teamMemberships: {
        select: { teamId: true }
      }
    }
  });

  if (!user) {
    redirect('/');
  }

  const isAdmin = checkIsAdmin(user.role);
  
  // Nur Admins dürfen die Kalenderseite sehen
  if (!isAdmin) {
    redirect('/tasks');
  }

  const isKoordinator = isKoordinatorOrHigher(user.role);
  const canViewOthers = isAdmin || isKoordinator;

  // Team IDs sammeln
  const teamIds: string[] = [];
  if (user.teamId) teamIds.push(user.teamId);
  user.teamMemberships?.forEach(tm => {
    if (!teamIds.includes(tm.teamId)) teamIds.push(tm.teamId);
  });

  // Team-Mitglieder laden (für Admin/Koordinator)
  let teamMembers: { id: string; name: string | null; email: string }[] = [];

  if (isAdmin) {
    teamMembers = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' }
    });
  } else if (isKoordinator && teamIds.length > 0) {
    teamMembers = await prisma.user.findMany({
      where: {
        OR: [
          { teamId: { in: teamIds } },
          { teamMemberships: { some: { teamId: { in: teamIds } } } }
        ]
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' }
    });
  } else {
    teamMembers = [{ id: user.id, name: user.name, email: user.email }];
  }

  return (
    <CalendarPlanningClient
      currentUser={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      teamMembers={teamMembers}
      canViewOthers={canViewOthers}
      isAdmin={isAdmin}
    />
  );
}
