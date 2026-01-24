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

  let users: any[] = [];
  let teams: any[] = [];
  try {
    users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Teams laden, in denen der User Mitglied ist (oder alle für Admins)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
    
    if (isAdmin) {
      teams = await prisma.team.findMany({
        select: { id: true, name: true, color: true },
        orderBy: { name: 'asc' }
      });
    } else {
      // Nur Teams wo User Mitglied ist
      const memberships = await prisma.teamMember.findMany({
        where: { userId: session.user.id },
        include: { team: { select: { id: true, name: true, color: true } } }
      });
      teams = memberships.map(m => m.team);
    }
  } catch (error) {
    console.error('Database error:', error);
  }

  return <ProjektsClient users={users || []} teams={teams || []} />;
}
