import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NewTicketClient } from './new-ticket-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function NewTicketPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Hole User mit Organisations-Info
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { 
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

  // User sehen nur Mitglieder aus ihren Organisationen
  const users = await prisma.user.findMany({
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

  return <NewTicketClient users={users || []} />;
}
