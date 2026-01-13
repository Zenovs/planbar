import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RessourcenClient } from './ressourcen-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function RessourcenPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Alle User mit ihren zugewiesenen SubTasks laden
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      weeklyHours: true,
      workloadPercent: true,
      assignedSubTasks: {
        where: {
          completed: false
        },
        select: {
          id: true,
          title: true,
          estimatedHours: true,
          dueDate: true,
          completed: true,
          ticket: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        },
        orderBy: {
          dueDate: 'asc'
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Alle Projekte mit SubTasks für Timeline
  const projects = await prisma.ticket.findMany({
    where: {
      status: {
        in: ['open', 'in_progress']
      }
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      subTasks: {
        where: {
          completed: false,
          dueDate: { not: null }
        },
        select: {
          id: true,
          title: true,
          estimatedHours: true,
          dueDate: true,
          assigneeId: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          dueDate: 'asc'
        }
      }
    },
    orderBy: {
      title: 'asc'
    }
  });

  return <RessourcenClient users={users} projects={projects} />;
}
