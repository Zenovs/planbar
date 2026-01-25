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

  const users = await prisma.user.findMany({
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
  });

  return <NewTicketClient users={users || []} />;
}
