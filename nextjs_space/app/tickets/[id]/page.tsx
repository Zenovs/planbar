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

  return <TicketDetailClient ticket={ticket} users={users || []} categories={categories || []} />;
}
