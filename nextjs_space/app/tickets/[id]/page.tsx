import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProjektDetailClient } from './ticket-detail-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

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
  
  if (currentUser?.role?.toLowerCase() === 'admin') {
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

  const [ticket, users, teams] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: true,
        createdBy: true,
        team: true,
        subTasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    }),
    // User sehen nur Mitglieder aus ihren Organisationen
    prisma.user.findMany({
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
    }),
    prisma.team.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  if (!ticket) {
    redirect('/tickets');
  }

  return <ProjektDetailClient ticket={ticket} users={users || []} teams={teams || []} />;
}
