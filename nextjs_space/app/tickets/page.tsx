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

  // Aus Datenschutzgründen sehen Admins keine Projekt-/Ticket-Details
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { 
      role: true,
      organizationId: true,
      teamMemberships: {
        select: {
          team: {
            select: { organizationId: true }
          }
        }
      }
    }
  });
  
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  
  if (isAdmin) {
    redirect('/dashboard');
  }

  // Sammle alle Organisations-IDs des Users
  const userOrgIds: string[] = [];
  if (currentUser?.organizationId) {
    userOrgIds.push(currentUser.organizationId);
  }
  currentUser?.teamMemberships?.forEach(tm => {
    if (tm.team.organizationId && !userOrgIds.includes(tm.team.organizationId)) {
      userOrgIds.push(tm.team.organizationId);
    }
  });

  let users: any[] = [];
  let teams: any[] = [];
  try {
    // User sehen nur Mitglieder aus ihren Organisationen
    users = await prisma.user.findMany({
      where: {
        AND: [
          // Admins aus Dropdown-Listen ausschließen
          { role: { notIn: ['admin', 'administrator'] } },
          // Nur User aus denselben Organisationen
          userOrgIds.length > 0 ? {
            OR: [
              { organizationId: { in: userOrgIds } },
              { teamMemberships: { some: { team: { organizationId: { in: userOrgIds } } } } }
            ]
          } : {}
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Nur Teams wo User Mitglied ist (Admin bereits ausgeschlossen)
    const memberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      include: { team: { select: { id: true, name: true, color: true } } }
    });
    teams = memberships.map(m => m.team);
  } catch (error) {
    console.error('Database error:', error);
  }

  return <ProjektsClient users={users || []} teams={teams || []} />;
}
