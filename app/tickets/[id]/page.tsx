import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TicketDetailClient } from './ticket-detail-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const [ticket, users, categories] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: true,
        createdBy: true,
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  if (!ticket) {
    redirect('/tickets');
  }

  // Serialize dates to prevent hydration errors
  const serializedTicket = {
    ...ticket,
    deadline: ticket.deadline ? ticket.deadline.toISOString() : null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    assignedTo: ticket.assignedTo ? {
      ...ticket.assignedTo,
      createdAt: ticket.assignedTo.createdAt.toISOString(),
      updatedAt: ticket.assignedTo.updatedAt.toISOString(),
    } : null,
    createdBy: ticket.createdBy ? {
      ...ticket.createdBy,
      createdAt: ticket.createdBy.createdAt.toISOString(),
      updatedAt: ticket.createdBy.updatedAt.toISOString(),
    } : null,
    category: ticket.category ? {
      ...ticket.category,
      createdAt: ticket.category.createdAt.toISOString(),
      updatedAt: ticket.category.updatedAt.toISOString(),
    } : null,
    subTasks: ticket.subTasks?.map(st => ({
      ...st,
      createdAt: st.createdAt.toISOString(),
      updatedAt: st.updatedAt.toISOString(),
    })) || [],
  };

  return <TicketDetailClient ticket={serializedTicket as any} users={users || []} categories={categories || []} />;
}
