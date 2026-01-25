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
    select: { role: true }
  });
  
  if (currentUser?.role?.toLowerCase() === 'admin') {
    redirect('/dashboard');
  }

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
    prisma.user.findMany({
      where: {
        // Admins aus Dropdown-Listen ausschließen
        role: { notIn: ['admin', 'administrator'] }
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
